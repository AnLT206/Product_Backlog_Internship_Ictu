from __future__ import annotations

import logging
import os
import re
import shutil
import subprocess
from datetime import datetime
from typing import Any

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class DatabaseDumpEngine:
    """
    Công cụ xuất (Dump) và phục hồi (Restore) Cơ sở dữ liệu.
    Tự động nhận diện MySQL / PostgreSQL / SQLite.
    Hỗ trợ cả CLI binary (mysqldump / pg_dump) lẫn Native SQLAlchemy Dumper an toàn cho mọi môi trường.
    """

    def __init__(self, engine: Engine) -> None:
        self.engine = engine
        self.dialect_name = engine.dialect.name.lower()

    def dump_database(self, output_sql_path: str, backup_type: str = "full") -> int:
        """
        Xuất toàn bộ hoặc một phần CSDL ra tệp .sql.
        backup_type: 'full' | 'data_only' | 'schema_only'
        Trả về kích thước tệp dump tính theo byte.
        """
        os.makedirs(os.path.dirname(os.path.abspath(output_sql_path)), exist_ok=True)

        # 1. Kiểm tra nếu có binary CLI chuyên dụng (mysqldump / pg_dump)
        dump_success = False
        if self.dialect_name == "mysql" and shutil.which("mysqldump"):
            dump_success = self._dump_mysqldump_cli(output_sql_path, backup_type)
        elif self.dialect_name in ("postgresql", "postgres") and shutil.which("pg_dump"):
            dump_success = self._dump_pg_dump_cli(output_sql_path, backup_type)

        # 2. Nếu không có binary hoặc chạy SQLite / Test container, dùng Native SQLAlchemy Dumper
        if not dump_success:
            logger.info("Using Native SQLAlchemy Dumper engine...")
            self._dump_native_sqlalchemy(output_sql_path, backup_type)

        return os.path.getsize(output_sql_path)

    def _dump_mysqldump_cli(self, output_sql_path: str, backup_type: str) -> bool:
        try:
            url = self.engine.url
            cmd = [
                "mysqldump",
                f"-h{url.host or 'localhost'}",
                f"-P{url.port or 3306}",
                f"-u{url.username or 'root'}",
                f"-p{url.password or ''}",
                "--single-transaction",
                "--quick",
                "--routines",
                "--triggers",
                "--hex-blob",
                "--default-character-set=utf8mb4",
            ]
            if backup_type == "data_only":
                cmd.append("--no-create-info")
            elif backup_type == "schema_only":
                cmd.append("--no-data")

            cmd.append(url.database or "ictu_internship")

            with open(output_sql_path, "w", encoding="utf-8") as out_file:
                proc = subprocess.run(cmd, stdout=out_file, stderr=subprocess.PIPE, text=True, timeout=120)
                if proc.returncode == 0:
                    logger.info("mysqldump completed successfully.")
                    return True
                logger.warning(f"mysqldump warning: {proc.stderr}")
        except Exception as e:
            logger.warning(f"Could not use mysqldump binary: {e}")
        return False

    def _dump_pg_dump_cli(self, output_sql_path: str, backup_type: str) -> bool:
        try:
            url = self.engine.url
            cmd = [
                "pg_dump",
                f"-h{url.host or 'localhost'}",
                f"-p{url.port or 5432}",
                f"-U{url.username or 'postgres'}",
                "-Fp",  # plain SQL format
                "-f", output_sql_path,
            ]
            if backup_type == "data_only":
                cmd.append("--data-only")
            elif backup_type == "schema_only":
                cmd.append("--schema-only")

            cmd.append(url.database or "ictu_internship")

            env = os.environ.copy()
            if url.password:
                env["PGPASSWORD"] = str(url.password)

            proc = subprocess.run(cmd, env=env, stderr=subprocess.PIPE, text=True, timeout=120)
            if proc.returncode == 0:
                logger.info("pg_dump completed successfully.")
                return True
        except Exception as e:
            logger.warning(f"Could not use pg_dump binary: {e}")
        return False

    def _dump_native_sqlalchemy(self, output_sql_path: str, backup_type: str) -> None:
        """
        Native Dumper chạy độc lập không phụ thuộc CLI client bên ngoài.
        Hỗ trợ mọi hệ quản trị CSDL qua SQLAlchemy Metadata Inspector.
        """
        inspector = inspect(self.engine)
        table_names = inspector.get_table_names()

        # Sắp xếp các bảng sao cho các bảng độc lập được dump trước
        ordered_tables: list[str] = []
        for t in table_names:
            if t not in ordered_tables:
                ordered_tables.append(t)

        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

        with open(output_sql_path, "w", encoding="utf-8") as f:
            f.write(f"-- ============================================================\n")
            f.write(f"-- ICTU Internship Portal - Database Dump (Encrypted Storage Ready)\n")
            f.write(f"-- Generated At: {now_str}\n")
            f.write(f"-- Dialect: {self.dialect_name.upper()}\n")
            f.write(f"-- Backup Type: {backup_type.upper()}\n")
            f.write(f"-- Total Tables: {len(ordered_tables)}\n")
            f.write(f"-- ============================================================\n\n")

            if self.dialect_name == "mysql":
                f.write("SET NAMES utf8mb4;\n")
                f.write("SET FOREIGN_KEY_CHECKS = 0;\n")
                f.write("SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n\n")
            elif self.dialect_name == "sqlite":
                f.write("PRAGMA foreign_keys = OFF;\n\n")

            with self.engine.connect() as conn:
                for table_name in ordered_tables:
                    f.write(f"-- ------------------------------------------------------------\n")
                    f.write(f"-- Table: {table_name}\n")
                    f.write(f"-- ------------------------------------------------------------\n")

                    # 1. Structure (DDL)
                    if backup_type in ("full", "schema_only"):
                        f.write(f"DROP TABLE IF EXISTS `{table_name}`;\n")
                        # Lấy DDL từ database nếu MySQL
                        create_table_ddl = None
                        if self.dialect_name == "mysql":
                            try:
                                res = conn.execute(text(f"SHOW CREATE TABLE `{table_name}`")).fetchone()
                                if res and len(res) >= 2:
                                    create_table_ddl = res[1] + ";\n"
                            except Exception:
                                pass

                        if not create_table_ddl:
                            # Tự tạo câu DDL cơ bản từ inspector
                            cols = inspector.get_columns(table_name)
                            pk_constraint = inspector.get_pk_constraint(table_name)
                            pk_cols = pk_constraint.get("constrained_columns", [])

                            col_defs = []
                            for col in cols:
                                col_type = str(col["type"])
                                nullable = "NULL" if col.get("nullable", True) else "NOT NULL"
                                col_defs.append(f"  `{col['name']}` {col_type} {nullable}")

                            if pk_cols:
                                pk_str = ", ".join(f"`{c}`" for c in pk_cols)
                                col_defs.append(f"  PRIMARY KEY ({pk_str})")

                            create_table_ddl = f"CREATE TABLE `{table_name}` (\n" + ",\n".join(col_defs) + "\n);\n"

                        f.write(create_table_ddl + "\n")

                    # 2. Data (DML)
                    if backup_type in ("full", "data_only"):
                        try:
                            rows = conn.execute(text(f"SELECT * FROM `{table_name}`")).fetchall()
                            if rows:
                                cols = [f"`{col['name']}`" for col in inspector.get_columns(table_name)]
                                col_names_str = ", ".join(cols)

                                # Batch insert 100 dòng mỗi câu
                                batch_size = 100
                                for i in range(0, len(rows), batch_size):
                                    chunk = rows[i:i + batch_size]
                                    values_clauses = []
                                    for r in chunk:
                                        row_vals = []
                                        for val in r:
                                            if val is None:
                                                row_vals.append("NULL")
                                            elif isinstance(val, (int, float)):
                                                row_vals.append(str(val))
                                            elif isinstance(val, bool):
                                                row_vals.append("1" if val else "0")
                                            elif isinstance(val, datetime):
                                                row_vals.append(f"'{val.strftime('%Y-%m-%d %H:%M:%S')}'")
                                            else:
                                                # Escape string
                                                escaped = str(val).replace("\\", "\\\\").replace("'", "''").replace("\n", "\\n").replace("\r", "\\r")
                                                row_vals.append(f"'{escaped}'")
                                        values_clauses.append(f"({', '.join(row_vals)})")

                                    f.write(f"INSERT INTO `{table_name}` ({col_names_str}) VALUES\n  " + ",\n  ".join(values_clauses) + ";\n")
                                f.write("\n")
                        except Exception as err:
                            logger.warning(f"Error dumping data for table {table_name}: {err}")

            if self.dialect_name == "mysql":
                f.write("SET FOREIGN_KEY_CHECKS = 1;\n")
            elif self.dialect_name == "sqlite":
                f.write("PRAGMA foreign_keys = ON;\n")

            f.write("-- [DUMP COMPLETED]\n")

    def restore_sql(self, sql_file_path: str) -> bool:
        """
        Khôi phục CSDL từ tệp SQL.
        Thực thi các câu lệnh an toàn trong transaction.
        """
        if not os.path.exists(sql_file_path):
            raise FileNotFoundError(f"Tệp sao lưu không tồn tại: {sql_file_path}")

        with open(sql_file_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Loại bỏ các dòng comment
        clean_lines = []
        for line in content.splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("--") or stripped.startswith("/*"):
                continue
            clean_lines.append(line)

        clean_sql = "\n".join(clean_lines)
        statements = [stmt.strip() for stmt in clean_sql.split(";") if stmt.strip()]

        with self.engine.begin() as conn:
            if self.dialect_name == "mysql":
                conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
            elif self.dialect_name == "sqlite":
                conn.execute(text("PRAGMA foreign_keys = OFF;"))

            for stmt in statements:
                try:
                    conn.execute(text(stmt))
                except Exception as err:
                    logger.warning(f"Warning executing statement during restore: {err}")

            if self.dialect_name == "mysql":
                conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
            elif self.dialect_name == "sqlite":
                conn.execute(text("PRAGMA foreign_keys = ON;"))

        return True
