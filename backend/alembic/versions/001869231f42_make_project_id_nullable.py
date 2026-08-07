"""make_project_id_nullable

Revision ID: 001869231f42
Revises: 1d4d1b6db1d5
Create Date: 2026-08-07 18:23:35.915687

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001869231f42'
down_revision: Union[str, Sequence[str], None] = '1d4d1b6db1d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('chat_sessions', 'project_id',
               existing_type=sa.INTEGER(),
               nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('chat_sessions', 'project_id',
               existing_type=sa.INTEGER(),
               nullable=False)
