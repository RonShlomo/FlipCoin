import os
os.environ["TRANSFORMERS_NO_TORCHVISION"] = "1"

import re
import random
import psycopg2
from psycopg2.extras import RealDictCursor
import torch
from transformers import AutoConfig, AutoTokenizer, AutoModelForSeq2SeqLM, AutoModelForCausalLM

HF_MODEL = os.getenv("HF_MODEL", "Qwen/Qwen2.5-0.5B-Instruct")
HF_DEVICE = os.getenv("HF_DEVICE", "cpu")
DATABASE_URL = os.getenv("DATABASE_URL") 
DTYPE = torch.float32

def _clean_output(text: str) -> str:
    text = text.strip()
    text = re.sub(r"(?i)\b(?:<=?|=)\s*\d+\s*words\.?", "", text)
    text = re.sub(r"(?i)\bunder\s+\w+\s+words\b\.?", "", text)
    text = re.sub(r"(?i)\bdo not mention.*?(?:name|token)s?.*?\.?", "", text)
    text = re.sub(r"(?i)\banswer:\s*", "", text)
    text = re.sub(r"^(?:\d+[\.\)]\s*)+", "", text)
    text = re.sub(r"^(?:sure|certainly|of course|here'?s|well|okay|ok)[,!\s:;-]+", "", text, flags=re.I)
    text = re.sub(r"\s{2,}", " ", text).strip()
    m = re.match(r'^(.*?[.!?]["”\']?)(\s|$)', text)
    return (m.group(1).strip() if m else text)

def _detect_task(config) -> str:
    archs = " ".join(config.architectures or []).lower()
    return "text2text-generation" if any(k in archs for k in ["t5","bart","mbart","m2m","pegasus","prophetnet","ul2","t0"]) else "text-generation"

def _load_model():
    config = AutoConfig.from_pretrained(HF_MODEL)
    tokenizer = AutoTokenizer.from_pretrained(HF_MODEL)
    task = _detect_task(config)
    if task == "text2text-generation":
        model = AutoModelForSeq2SeqLM.from_pretrained(HF_MODEL, torch_dtype=DTYPE, low_cpu_mem_usage=True)
    else:
        model = AutoModelForCausalLM.from_pretrained(HF_MODEL, torch_dtype=DTYPE, low_cpu_mem_usage=True)
    model = model.to(HF_DEVICE)
    return model, tokenizer, task

def _generate_tip(model, tokenizer, task, max_new_tokens=60, temperature=0.7, top_p=0.9) -> str:
    pid = random.randint(1000, 9999)
    prompt = (
        f"Instruction {pid}: Write one short, low-risk crypto investing tip for beginners. "
        "Avoid naming any specific tokens. Keep it concise and practical.\nTip:"
    )

    inputs = tokenizer(prompt, return_tensors="pt").to(HF_DEVICE)
    kwargs = dict(max_new_tokens=max_new_tokens, do_sample=True, temperature=temperature,
                  top_p=top_p, repetition_penalty=1.1, no_repeat_ngram_size=3, early_stopping=True)
    with torch.no_grad():
        out = model.generate(**inputs, **kwargs)

    if task == "text2text-generation":
        text = tokenizer.decode(out[0], skip_special_tokens=True).strip()
    else:
        p_len = inputs["input_ids"].shape[-1]
        cont = out[0][p_len:]
        text = tokenizer.decode(cont, skip_special_tokens=True).strip()

    return _clean_output(text)

def _save_tip_to_db(tip: str):
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO ai_insights (content)
        VALUES (%s)
        ON CONFLICT (content) DO NOTHING
        RETURNING id;
    """, (tip,))
    conn.commit()
    cur.close()
    conn.close()
    print("Saved tip:", tip)

if __name__ == "__main__":
    print("🔄 Generating daily tip...")
    model, tokenizer, task = _load_model()
    tip = _generate_tip(model, tokenizer, task)
    _save_tip_to_db(tip)
    print("🏁 Done.")
