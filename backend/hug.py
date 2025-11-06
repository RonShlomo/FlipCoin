import os
import re
import logging
from typing import Optional

from fastapi import FastAPI, Query, HTTPException
from pydantic import BaseModel
from transformers import (
    AutoConfig,
    AutoTokenizer,
    AutoModelForSeq2SeqLM,
    AutoModelForCausalLM,
    pipeline,
)
import torch

logger = logging.getLogger("uvicorn.error")

app = FastAPI(title="Insight API", version="1.0.0")

HF_MODEL = os.getenv("HF_MODEL", "google/flan-t5-small")
DEVICE = "cpu"
DTYPE = torch.float32

_PIPE = None
_PIPE_TASK = None


def _clean_output(text: str) -> str:
    output = text.strip()
    output = re.sub(r"^\s*\d+[\.\)]\s*", "", output)
    output = re.sub(r"(\.\s*)\d+[\.\)]\s*", r"\1", output)
    output = re.sub(r"^(?:sure|certainly|of course|here'?s|well|okay|ok)[,!\s:;-]+", "", output, flags=re.I)
    if ":" in output and len(output.split(":", 1)[0]) < len(output):
        maybe_label, rest = output.split(":", 1)
        if len(maybe_label) <= 14:
            output = rest.strip()
    return output


def _detect_task(config: AutoConfig) -> str:
    archs = config.architectures or []
    archs_str = " ".join(archs).lower()

    if any(k in archs_str for k in ["t5", "bart", "mbart", "m2m", "pegasus", "prophetnet", "ul2", "t0"]):
        return "text2text-generation"

    return "text-generation"


def get_pipe():
    global _PIPE, _PIPE_TASK
    if _PIPE is not None:
        return _PIPE

    logger.info(f"Loading model: {HF_MODEL}")

    config = AutoConfig.from_pretrained(HF_MODEL)
    tokenizer = AutoTokenizer.from_pretrained(HF_MODEL)

    task = _detect_task(config)
    _PIPE_TASK = task

    if task == "text2text-generation":
        model = AutoModelForSeq2SeqLM.from_pretrained(
            HF_MODEL,
            torch_dtype=DTYPE,
        )
    else:
        model = AutoModelForCausalLM.from_pretrained(
            HF_MODEL,
            torch_dtype=DTYPE,
        )

    logger.info(f"Initialized task '{task}' on device '{DEVICE}'")

    gen_pipe = pipeline(
        task,
        model=model,
        tokenizer=tokenizer,
        device_map=None,
    )

    return gen_pipe


class InsightRequest(BaseModel):
    text: str
    max_new_tokens: Optional[int] = 128
    temperature: Optional[float] = 0.3
    top_p: Optional[float] = 0.95


@app.get("/health")
def health():
    try:
        _ = get_pipe()
        return {"status": "ok", "model": HF_MODEL}
    except Exception as e:
        logger.exception("Health check failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/insight")
def get_insight(
    text: str = Query(..., min_length=1, description="Input text/prompt"),
    max_new_tokens: int = Query(128, ge=1, le=512),
    temperature: float = Query(0.3, ge=0.0, le=2.0),
    top_p: float = Query(0.95, ge=0.0, le=1.0),
):
    try:
        pipe = get_pipe()

        kwargs = dict(
            max_new_tokens=max_new_tokens,
            temperature=temperature,
            top_p=top_p,
        )

        do_sample = temperature > 0.0
        kwargs["do_sample"] = do_sample

        outputs = pipe(text, **kwargs)

        if _PIPE_TASK == "text2text-generation":
            generated = outputs[0].get("generated_text", "")
        else:
            generated = outputs[0].get("generated_text") or outputs[0].get("text", "")

        cleaned = _clean_output(generated or "")

        return {
            "input": text,
            "output": cleaned,
            "raw": generated,
            "model": HF_MODEL,
            "task": _PIPE_TASK,
            "params": {
                "max_new_tokens": max_new_tokens,
                "temperature": temperature,
                "top_p": top_p,
                "do_sample": do_sample,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error in /insight")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/insight")
def post_insight(body: InsightRequest):
    return get_insight(
        text=body.text,
        max_new_tokens=body.max_new_tokens or 128,
        temperature=body.temperature or 0.3,
        top_p=body.top_p or 0.95,
    )
