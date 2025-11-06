import os
import re
import torch
from fastapi import FastAPI
from transformers import AutoTokenizer, AutoModelForCausalLM, AutoModelForSeq2SeqLM, pipeline

app = FastAPI()
HF_MODEL = os.environ.get("HF_MODEL", "google/flan-t5-small")
_pipe = None
_task = None

def get_pipe():
    global _pipe, _task
    if _pipe is None:
        os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
        os.environ.setdefault("HF_HOME", "/tmp/hf")
        torch.set_num_threads(1)
        if "flan-t5" in HF_MODEL or "t5-" in HF_MODEL:
            _task = "text2text-generation"
            tok = AutoTokenizer.from_pretrained(HF_MODEL)
            mdl = AutoModelForSeq2SeqLM.from_pretrained(HF_MODEL, low_cpu_mem_usage=True, torch_dtype=torch.float32)
        else:
            _task = "text-generation"
            tok = AutoTokenizer.from_pretrained(HF_MODEL)
            mdl = AutoModelForCausalLM.from_pretrained(HF_MODEL, low_cpu_mem_usage=True, torch_dtype=torch.float32)
        _pipe = pipeline(_task, model=mdl, tokenizer=tok, device_map="cpu")
    return _pipe

def clean_output(text: str) -> str:
    output = text.strip()
    output = re.sub(r"^\s*\d+[\.\)]\s*", "", output)
    output = re.sub(r"(\.\s*)\d+[\.\)]\s*", r"\1", output)
    output = re.sub(r"^(?:sure|certainly|of course|here'?s|well|okay|ok)[,!\s:;-]+", "", output, flags=re.I)
    if ":" in output and len(output.split(":", 1)[0]) < len(output):
        output = output.split(":", 1)[1].strip()
    first_sentence = output.split(".")[0]
    if len(first_sentence) > 10:
        output = first_sentence + "."
    return output

@app.get("/")
def root():
    return {"ok": True, "endpoints": ["/insight"]}

@app.get("/insight")
def get_insight():
    pipe = get_pipe()
    if _task == "text2text-generation":
        prompt = "Give ONE actionable crypto trading insight in under 25 words."
        out = pipe(prompt, max_new_tokens=48, temperature=0.6)[0]["generated_text"]
        return {"tip": clean_output(out)}
    prompt = ("### System:\nYou are a professional crypto trader. Respond with one concise sentence under 25 words.\n"
              "### User:\nGive one actionable crypto trading insight.\n### Assistant:\n")
    out = pipe(
        prompt,
        max_new_tokens=60,
        do_sample=True,
        temperature=0.6,
        repetition_penalty=1.25,
        eos_token_id=pipe.tokenizer.eos_token_id,
        pad_token_id=pipe.tokenizer.eos_token_id,
    )[0]["generated_text"]
    text = out.split("### Assistant:")[-1].strip()
    return {"tip": clean_output(text)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("hug:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
