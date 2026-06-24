"""Programmatic verifier (ground truth) for hard constraints."""

import re
from typing import Tuple


def verify_node(node: dict, ctx: dict) -> Tuple[bool, str]:
    """Hard constraints that kill branches regardless of LLM enthusiasm."""
    content = (node.get("content", "") + " " + node.get("label", "")).lower()
    depth = node["depth"]
    background = ctx.get("background", "").lower()
    budget = ctx.get("budget", "")
    region = ctx.get("region", "")
    industry = ctx.get("industry", "")

    # Depth 1: industry alignment
    if depth == 1 and industry:
        industry_keywords = {
            "HealthTech": ["health", "medical", "patient", "clinical", "wellness", "care", "diagnosis"],
            "FinTech": ["finance", "banking", "payment", "credit", "investment", "fintech", "transaction"],
            "EdTech": ["education", "learning", "student", "school", "course", "university", "teaching"],
            "AgriTech": ["agriculture", "farm", "crop", "livestock", "soil", "harvest"],
            "Construction & Real Estate": ["construction", "real estate", "property", "building", "contractor"],
            "Logistics & Supply Chain": ["logistics", "supply chain", "shipping", "warehouse", "delivery"],
            "HR & Talent": ["hr", "talent", "hiring", "recruitment", "workforce", "employee"],
            "Legal Tech": ["legal", "law", "contract", "compliance", "attorney", "litigation"],
            "Climate Tech": ["climate", "carbon", "sustainability", "energy", "renewable", "emission"],
            "E-commerce": ["ecommerce", "retail", "shopping", "merchant", "store", "marketplace"],
            "DevTools": ["developer", "code", "api", "sdk", "git", "deployment", "infrastructure"],
        }
        keywords = industry_keywords.get(industry, [industry.lower()])
        if not any(k in content for k in keywords):
            return False, f"Market thesis does not align with selected industry ({industry})"

    # Depth 3: technical feasibility
    if depth == 3:
        tech_indicators = [
            "ai ", "machine learning", "ml ", "computer vision", "deep learning",
            "llm", "vector db", "neural network", "pytorch", "tensorflow",
        ]
        has_tech = any(t in content for t in tech_indicators)
        non_tech = [
            "marketer", "sales", "business", "mba", "non-technical", "no-code",
            "designer", "writer", "operations", "consultant",
        ]
        is_non_tech = any(b in background for b in non_tech)
        if has_tech and is_non_tech:
            return False, "Technical solution (AI/ML) requires engineering background; founder appears non-technical"

    # Depth 4: budget feasibility
    if depth == 4:
        mentions = re.findall(
            r'\$(\d+(?:,\d+)*(?:\.\d+)?)\s*(k|K|thousand|million|M)?',
            node.get("content", ""),
        )
        founder_max = 999_999_999
        if "$5k" in budget:
            founder_max = 20_000
        elif "$20k" in budget:
            founder_max = 50_000
        elif "$50k" in budget:
            founder_max = 150_000
        elif "$150k" in budget:
            founder_max = 500_000

        for amount, suffix in mentions:
            amount = amount.replace(",", "")
            try:
                num = float(amount)
                if suffix and suffix.lower() in ("k", "thousand"):
                    num *= 1_000
                elif suffix and suffix.lower() in ("m", "million"):
                    num *= 1_000_000
                if num > founder_max * 2.5:
                    return False, f"Business model implies ${num:,.0f} but founder cap is ~${founder_max:,.0f}"
            except ValueError:
                continue

        if region in ("Europe", "North America") and any(
            h in content for h in ["health data", "medical data", "patient data", "phi", "hipaa"]
        ):
            if "gdpr" not in content and "compliance" not in content and "hipaa" not in content:
                return False, f"Health data in {region} requires regulatory compliance; reasoning lacks it"

    return True, ""