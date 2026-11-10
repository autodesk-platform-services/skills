"""Copy _shared/aps_common.py into every skills/<api>/<skill>/scripts/ folder."""
import shutil
from pathlib import Path

root = Path(__file__).resolve().parent.parent
src = root / "_shared" / "aps_common.py"
for scripts in sorted((root / "skills").glob("*/*/scripts")):
    shutil.copy2(src, scripts / "aps_common.py")
    print(f"vendored -> {scripts.relative_to(root)}/aps_common.py")
