import os
os.environ["TRANSFORMERS_NO_TORCHVISION"] = "1"

import re
import logging
import random
from typing import Optional
from fastapi import FastAPI, Query, HTTPException
from pydantic import BaseModel
from transformers import AutoConfig, AutoTokenizer, AutoModelForSeq2SeqLM, AutoModelForCausalLM
import torch

logger = logging.getLogger("uvicorn.error")
app = FastAPI(title="Insight API", version="1.1.0")

HF_MODEL = os.getenv("HF_MODEL", "Qwen/Qwen2.5-0.5B-Instruct")
DEVICE = os.getenv("HF_DEVICE", "cpu")
DTYPE = torch.float32

_MODEL = None
_TOKENIZER = None
_TASK = None

def _clean_output(text: str) -> str:
    output = text.strip()
    output = re.sub(r"(?i)\b(?:<=?|=)\s*\d+\s*words\.?", "", output)
    output = re.sub(r"(?i)\bunder\s+\w+\s+words\b\.?", "", output)
    output = re.sub(r"(?i)\bdo not mention.*?(?:name|token)s?.*?\.?", "", output)
    output = re.sub(r"(?i)\banswer:\s*", "", output)
    output = re.sub(r"^(?:\d+[\.\)]\s*)+", "", output)
    output = re.sub(r"^(?:sure|certainly|of course|here'?s|well|okay|ok)[,!\s:;-]+", "", output, flags=re.I)
    output = re.sub(r"\s{2,}", " ", output).strip()
    sentence_match = re.match(r'^(.*?[.!?]["”\']?)(\s|$)', output)
    if sentence_match:
        output = sentence_match.group(1).strip()
    return output


def _looks_like_instruction(s: str) -> bool:
    s_low = s.lower()
    bad = ["you are a concise", "write exactly one", "keep it under", "do not mention", "answer:"]
    return any(k in s_low for k in bad)

def _detect_task(config) -> str:
    archs = (config.architectures or [])
    archs_str = " ".join(archs).lower()
    if any(k in archs_str for k in ["t5", "bart", "mbart", "m2m", "pegasus", "prophetnet", "ul2", "t0"]):
        return "text2text-generation"
    return "text-generation"

def _load_model():
    global _MODEL, _TOKENIZER, _TASK
    if _MODEL is not None:
        return _MODEL, _TOKENIZER, _TASK
    config = AutoConfig.from_pretrained(HF_MODEL)
    tokenizer = AutoTokenizer.from_pretrained(HF_MODEL)
    task = _detect_task(config)
    if task == "text2text-generation":
        model = AutoModelForSeq2SeqLM.from_pretrained(HF_MODEL, torch_dtype=DTYPE, low_cpu_mem_usage=True)
    else:
        model = AutoModelForCausalLM.from_pretrained(HF_MODEL, torch_dtype=DTYPE, low_cpu_mem_usage=True)
    model = model.to(DEVICE)
    _MODEL, _TOKENIZER, _TASK = model, tokenizer, task
    return _MODEL, _TOKENIZER, _TASK

def _generate(text: str, max_new_tokens: int, temperature: float, top_p: float) -> str:
    model, tokenizer, task = _load_model()
    inputs = tokenizer(text, return_tensors="pt").to(DEVICE)
    gen_kwargs = dict(
        max_new_tokens=max_new_tokens,
        do_sample=True,
        temperature=temperature,
        top_p=top_p,
        repetition_penalty=1.1,
        no_repeat_ngram_size=3,
        early_stopping=True,
    )
    with torch.no_grad():
        output_ids = model.generate(**inputs, **gen_kwargs)
    if task == "text2text-generation":
        generated = tokenizer.decode(output_ids[0], skip_special_tokens=True).strip()
    else:
        prompt_len = inputs["input_ids"].shape[-1]
        continuation = output_ids[0][prompt_len:]
        generated = tokenizer.decode(continuation, skip_special_tokens=True).strip()
    return generated or ""

class InsightRequest(BaseModel):
    text: str
    max_new_tokens: Optional[int] = 60
    temperature: Optional[float] = 0.7
    top_p: Optional[float] = 0.9

@app.on_event("startup")
def _warmup():
    try:
        _ = _load_model()
        print(f"✅ Model {HF_MODEL} loaded on {DEVICE}")
    except Exception:
        logger.exception("Warmup failed")

@app.get("/health")
def health():
    try:
        _ = _load_model()
        return {"status": "ok", "model": HF_MODEL, "task": _TASK, "device": DEVICE}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tip")
def tip(
    max_new_tokens: int = Query(60, ge=8, le=100),
    temperature: float = Query(0.7, ge=0.0, le=2.0),
    top_p: float = Query(0.9, ge=0.0, le=1.0),
):
    prompt_id = random.randint(1000, 9999)
    base_prompt = (
        f"Instruction {prompt_id}: Write one short, low-risk crypto investing tip for beginners. "
        "Avoid naming any specific tokens. Keep it concise and practical.\nTip:"
    )
    raw = _generate(base_prompt, max_new_tokens, temperature, top_p)
    cleaned = _clean_output(raw)
    if not cleaned or len(cleaned.split()) < 4 or _looks_like_instruction(cleaned):
        alt = "Give one concise, practical crypto investing tip for beginners. No token names."
        raw = _generate(alt, max_new_tokens, temperature, top_p)
        cleaned = _clean_output(raw)
    return {"tip": cleaned}

@app.post("/insight")
def post_insight(body: InsightRequest):
    try:
        raw = _generate(body.text, body.max_new_tokens, body.temperature, body.top_p)
        cleaned = _clean_output(raw)
        if not cleaned or len(cleaned.split()) < 4 or _looks_like_instruction(cleaned):
            alt = "Give one concise, low-risk crypto investing tip for a beginner. No token names."
            raw = _generate(alt, body.max_new_tokens, body.temperature, body.top_p)
            cleaned = _clean_output(raw)
        return {"input": body.text, "output": cleaned, "model": HF_MODEL}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
