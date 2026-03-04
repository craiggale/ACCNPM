"""
Services package for business logic.

Contains service modules that encapsulate business rules:
- resource_allocation: 3-tier auto-assignment algorithm
- task_dependencies: Cascading date resolution
- kvi_service: Value metrics calculations
- kpi_service: Business outcomes and Value Gap detection
"""

from .resource_allocation import auto_assign_resources, ResourceAllocationService
from .task_dependencies import update_task_cascade, TaskDependencyService
from .kvi_service import get_portfolio_kvi, KVIService
from .kpi_service import KPIService, calculate_kpi_weight

