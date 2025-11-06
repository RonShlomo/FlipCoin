import os
os.environ["TRANSFORMERS_NO_TORCHVISION"] = "1"

import re, time, random, torch
from transformers import AutoConfig, AutoTokenizer, AutoModelForSeq2SeqLM, AutoModelForCausalLM

HF_MODEL  = os.getenv("HF_MODEL", "Qwen/Qwen2.5-0.5B-Instruct")
HF_DEVICE = os.getenv("HF_DEVICE", "cpu")
DTYPE     = torch.float32

def clean(t):
    t = t.strip()
    t = re.sub(r"(?i)\b(?:<=?|=)\s*\d+\s*words\.?", "", t)
    t = re.sub(r"(?i)\bunder\s+\w+\s+words\b\.?", "", t)
    t = re.sub(r"(?i)\bdo not mention.*?(?:name|token)s?.*?\.?", "", t)
    t = re.sub(r"(?i)\banswer:\s*", "", t)
    t = re.sub(r"^(?:\d+[\.\)]\s*)+", "", t)
    t = re.sub(r"^(?:sure|certainly|of course|here'?s|well|okay|ok)[,!\s:;-]+", "", t, flags=re.I)
    t = re.sub(r"\s{2,}", " ", t).strip()
    m = re.match(r'^(.*?[.!?]["”\']?)(\s|$)', t)
    return (m.group(1).strip() if m else t)

def detect_task(cfg):
    a = " ".join(cfg.architectures or []).lower()
    return "text2text-generation" if any(k in a for k in ["t5","bart","mbart","m2m","pegasus","prophetnet","ul2","t0"]) else "text-generation"

def load_model():
    cfg = AutoConfig.from_pretrained(HF_MODEL)
    tok = AutoTokenizer.from_pretrained(HF_MODEL)
    task = detect_task(cfg)
    if task == "text2text-generation":
        mdl = AutoModelForSeq2SeqLM.from_pretrained(HF_MODEL, torch_dtype=DTYPE, low_cpu_mem_usage=True)
    else:
        mdl = AutoModelForCausalLM.from_pretrained(HF_MODEL, torch_dtype=DTYPE, low_cpu_mem_usage=True)
    mdl = mdl.to(HF_DEVICE)
    return mdl, tok, task

TEMPLATES = [
    "Give exactly one short, low-risk crypto investing tip for beginners about {topic}. No token names. Keep it actionable and concise.\nTip:",
    "One practical beginner crypto tip focused on {topic}. Avoid naming specific tokens. Be concrete and brief.\nTip:",
    "Write one risk-aware crypto tip on {topic} for a novice investor. No token names. Keep it punchy and specific.\nTip:",
]
TOPICS = [
    "position sizing","fees and spreads","diversification across sectors","setting a stop-loss plan",
    "rebalancing monthly","avoiding FOMO buys","dollar-cost averaging","cold storage basics",
    "security hygiene and 2FA","portfolio journaling","tax awareness","liquidity and slippage"
]

def seed():
    s = (int(time.time()*1000) ^ os.getpid() ^ int.from_bytes(os.urandom(2),"little")) & 0x7FFFFFFF
    random.seed(s); torch.manual_seed(s)

def prompt():
    return f"Instruction {random.randint(1000,9999)}: " + random.choice(TEMPLATES).format(topic=random.choice(TOPICS))

def gen(mdl, tok, task, max_new_tokens=60, temperature=1.1, top_p=0.96):
    p = prompt()
    inputs = tok(p, return_tensors="pt").to(HF_DEVICE)
    kw = dict(max_new_tokens=max_new_tokens, do_sample=True, temperature=temperature, top_p=top_p,
              repetition_penalty=1.2, no_repeat_ngram_size=3, early_stopping=True)
    with torch.no_grad():
        out = mdl.generate(**inputs, **kw)
    if task == "text2text-generation":
        txt = tok.decode(out[0], skip_special_tokens=True).strip()
    else:
        p_len = inputs["input_ids"].shape[-1]
        cont = out[0][p_len:]
        txt = tok.decode(cont, skip_special_tokens=True).strip()
    return clean(txt)

if __name__ == "__main__":
    seed()
    m,t,task = load_model()
    cands = {gen(m,t,task) for _ in range(3)}
    best = sorted(cands, key=lambda s: (len(s), s))[0]
    print(best)
