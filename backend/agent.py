"""SaaS Tree-of-Thought Research Agent — backward-compatible entry point."""

from models import UserContext
from runner import run_tot_agent

__all__ = ["run_tot_agent", "UserContext"]