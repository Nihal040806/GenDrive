"""
Analytics Routes
Provides improvement metrics and historical data analysis.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from database import get_db, GenerationLog, SimulationSession
from schemas import AnalyticsResponseSchema
from .simulation import state

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/current", response_model=dict)
async def get_current_analytics():
    """Get analytics for current simulation session."""
    if not state.is_initialized or not state.ga:
        return {
            "initialized": False,
            "message": "No active simulation"
        }
    
    stats = state.ga.get_statistics()
    
    # Calculate additional metrics
    best_history = stats['best_fitness_history']
    avg_history = stats['avg_fitness_history']
    
    improvement_rate = 0.0
    if len(best_history) >= 2:
        total_improvement = best_history[-1] - best_history[0]
        improvement_rate = total_improvement / len(best_history)
    
    # Find generation with biggest jump
    biggest_jump_gen = 0
    biggest_jump = 0.0
    for i in range(1, len(best_history)):
        jump = best_history[i] - best_history[i-1]
        if jump > biggest_jump:
            biggest_jump = jump
            biggest_jump_gen = i
    
    return {
        "initialized": True,
        "session_id": state.session_id,
        "total_generations": stats['generation'],
        "best_fitness_ever": max(best_history) if best_history else 0,
        "current_best_fitness": stats['current_best_fitness'],
        "current_avg_fitness": stats['current_avg_fitness'],
        "average_improvement_rate": improvement_rate,
        "biggest_improvement": {
            "generation": biggest_jump_gen,
            "improvement": biggest_jump
        },
        "fitness_history": {
            "best": best_history,
            "average": avg_history
        },
        "current_mutation_rate": state.ga.mutation_rate,
        "convergence_status": _analyze_convergence(best_history)
    }


def _analyze_convergence(fitness_history: list) -> dict:
    """Analyze if population is converging."""
    if len(fitness_history) < 20:
        return {"status": "learning", "message": "Still in early generations"}
    
    recent = fitness_history[-20:]
    variance = sum((x - sum(recent)/len(recent))**2 for x in recent) / len(recent)
    
    if variance < 0.01:
        return {
            "status": "converged",
            "message": "Population has converged. Consider increasing mutation or resetting."
        }
    elif variance < 0.1:
        return {
            "status": "stabilizing",
            "message": "Population is stabilizing. Good progress!"
        }
    else:
        return {
            "status": "exploring",
            "message": "Population is still exploring solution space."
        }


@router.get("/history", response_model=list)
async def get_generation_history(
    session_id: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get historical generation data from database."""
    query = db.query(GenerationLog)
    
    if session_id:
        query = query.filter(GenerationLog.session_id == session_id)
    
    logs = query.order_by(GenerationLog.generation.desc()).limit(limit).all()
    
    return [
        {
            "session_id": log.session_id,
            "generation": log.generation,
            "best_fitness": log.best_fitness,
            "average_fitness": log.average_fitness,
            "worst_fitness": log.worst_fitness,
            "mutation_rate": log.mutation_rate,
            "evolution_time_ms": log.evolution_time_ms,
            "timestamp": log.timestamp.isoformat()
        }
        for log in logs
    ]


@router.get("/sessions", response_model=list)
async def list_sessions(limit: int = 20, db: Session = Depends(get_db)):
    """List all simulation sessions."""
    sessions = db.query(SimulationSession)\
        .order_by(SimulationSession.started_at.desc())\
        .limit(limit)\
        .all()
    
    return [
        {
            "session_id": s.session_id,
            "total_generations": s.total_generations,
            "best_fitness_achieved": s.best_fitness_achieved,
            "started_at": s.started_at.isoformat(),
            "ended_at": s.ended_at.isoformat() if s.ended_at else None,
            "config": s.config
        }
        for s in sessions
    ]


@router.get("/comparison")
async def compare_sessions(
    session_ids: str,  # Comma-separated
    db: Session = Depends(get_db)
):
    """Compare multiple simulation sessions."""
    ids = session_ids.split(',')
    
    sessions = db.query(SimulationSession)\
        .filter(SimulationSession.session_id.in_(ids))\
        .all()
    
    if not sessions:
        return {"message": "No sessions found"}
    
    comparisons = []
    for s in sessions:
        logs = db.query(GenerationLog)\
            .filter(GenerationLog.session_id == s.session_id)\
            .all()
        
        fitness_values = [l.best_fitness for l in logs]
        
        comparisons.append({
            "session_id": s.session_id,
            "best_fitness": max(fitness_values) if fitness_values else 0,
            "total_generations": len(logs),
            "avg_improvement_per_gen": (
                (fitness_values[-1] - fitness_values[0]) / len(fitness_values)
                if len(fitness_values) >= 2 else 0
            ),
            "config": s.config
        })
    
    return {"sessions": comparisons}
