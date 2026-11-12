"""Import every model module here so Alembic autogenerate sees all tables.

Add one import line per module that defines models.
"""

from app.auth import models as auth_models  # noqa: F401
from app.candidate import models as candidate_models  # noqa: F401
from app.users import models as users_models  # noqa: F401
