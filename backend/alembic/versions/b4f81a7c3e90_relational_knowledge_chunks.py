"""relational_knowledge_chunks

Revision ID: b4f81a7c3e90
Revises: 001869231f42
Create Date: 2026-09-17 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b4f81a7c3e90'
down_revision: Union[str, Sequence[str], None] = '001869231f42'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add source_type column with index
    op.add_column('knowledge_chunks', sa.Column('source_type', sa.String(length=32), server_default='meeting', nullable=False))
    op.create_index('ix_knowledge_chunks_source_type', 'knowledge_chunks', ['source_type'])

    # 2. Add chat_message_id column with foreign key and index
    op.add_column('knowledge_chunks', sa.Column('chat_message_id', sa.String(), nullable=True))
    op.create_foreign_key(
        'fk_knowledge_chunks_chat_message_id',
        'knowledge_chunks', 'chat_messages',
        ['chat_message_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_index('ix_knowledge_chunks_chat_message_id', 'knowledge_chunks', ['chat_message_id'])

    # 3. Add source_metadata column
    op.add_column('knowledge_chunks', sa.Column('source_metadata', sa.JSON(), nullable=True))

    # 4. Alter columns that were meeting-specific to be nullable
    op.alter_column('knowledge_chunks', 'chunk_index',
               existing_type=sa.INTEGER(),
               nullable=True)
    op.alter_column('knowledge_chunks', 'start_timestamp',
               existing_type=sa.DateTime(timezone=True),
               nullable=True)
    op.alter_column('knowledge_chunks', 'end_timestamp',
               existing_type=sa.DateTime(timezone=True),
               nullable=True)
    op.alter_column('knowledge_chunks', 'participant_ids',
               existing_type=sa.JSON(),
               nullable=True)
    op.alter_column('knowledge_chunks', 'entry_count',
               existing_type=sa.INTEGER(),
               nullable=True)


def downgrade() -> None:
    op.alter_column('knowledge_chunks', 'entry_count',
               existing_type=sa.INTEGER(),
               nullable=False)
    op.alter_column('knowledge_chunks', 'participant_ids',
               existing_type=sa.JSON(),
               nullable=False)
    op.alter_column('knowledge_chunks', 'end_timestamp',
               existing_type=sa.DateTime(timezone=True),
               nullable=False)
    op.alter_column('knowledge_chunks', 'start_timestamp',
               existing_type=sa.DateTime(timezone=True),
               nullable=False)
    op.alter_column('knowledge_chunks', 'chunk_index',
               existing_type=sa.INTEGER(),
               nullable=False)
    op.drop_column('knowledge_chunks', 'source_metadata')
    op.drop_constraint('fk_knowledge_chunks_chat_message_id', 'knowledge_chunks', type_='foreignkey')
    op.drop_index('ix_knowledge_chunks_chat_message_id', table_name='knowledge_chunks')
    op.drop_column('knowledge_chunks', 'chat_message_id')
    op.drop_index('ix_knowledge_chunks_source_type', table_name='knowledge_chunks')
    op.drop_column('knowledge_chunks', 'source_type')
