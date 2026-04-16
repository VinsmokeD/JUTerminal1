"""Add performance indexes on hot-path queries.

Revision ID: 002_add_performance_indexes
Revises: 001_initial_schema
Create Date: 2026-04-16 11:47:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002_add_performance_indexes'
down_revision = '001_initial_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Index on sessions table
    op.create_index('idx_sessions_user_id', 'sessions', ['user_id'])
    op.create_index('idx_sessions_scenario_id', 'sessions', ['scenario_id'])

    # Index on command_log table
    op.create_index('idx_command_log_session_id', 'command_log', ['session_id'])

    # Index on siem_events table
    op.create_index('idx_siem_events_session_id', 'siem_events', ['session_id'])
    op.create_index('idx_siem_events_created_at', 'siem_events', ['created_at'])


def downgrade() -> None:
    op.drop_index('idx_siem_events_created_at')
    op.drop_index('idx_siem_events_session_id')
    op.drop_index('idx_command_log_session_id')
    op.drop_index('idx_sessions_scenario_id')
    op.drop_index('idx_sessions_user_id')
