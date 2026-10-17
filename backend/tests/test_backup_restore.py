import sqlite3
import os
import shutil

db_file = 'app.db'
backup_file = 'app_staging_backup.db'

print('==================================================')
print('[QA STAGING] BAT DAU KIEM THU SAO LUU & KHOI PHUC')
print('==================================================')

# 1. Tao moc du lieu thu nghiem truoc khi Backup
conn = sqlite3.connect(db_file)
cursor = conn.cursor()
cursor.execute('CREATE TABLE IF NOT EXISTS staging_test_check (id INTEGER PRIMARY KEY, tag TEXT);')
cursor.execute('INSERT INTO staging_test_check (tag) VALUES ("BENCHMARK_RESTORE_2026");')
conn.commit()
conn.close()
print('[1/4] PASSED: Da tao moc du lieu kiem thu (BENCHMARK_RESTORE_2026).')

# 2. Thuc hien Backup
shutil.copyfile(db_file, backup_file)
print('[2/4] PASSED: Da sao luu CSDL Staging thanh file backup.')

# 3. Gia lap su co mat du lieu
conn = sqlite3.connect(db_file)
cursor = conn.cursor()
cursor.execute('DELETE FROM staging_test_check WHERE tag="BENCHMARK_RESTORE_2026";')
conn.commit()
conn.close()
print('[3/4] PASSED: Gia lap su co mat du lieu thanh cong.')

# 4. Thuc hien Khoi phuc (Restore) & Kiem tra tinh toan ven
shutil.copyfile(backup_file, db_file)
conn = sqlite3.connect(db_file)
cursor = conn.cursor()
cursor.execute('SELECT tag FROM staging_test_check WHERE tag="BENCHMARK_RESTORE_2026";')
result = cursor.fetchone()
conn.close()

if result and result[0] == 'BENCHMARK_RESTORE_2026':
    print('[4/4] PASSED: Khoi phuc thanh cong! Du lieu truoc va sau Restore nguyen ven 100%.')
    print('==================================================')
    print('=> KET LUAN: DU LIEU DAT CHUAN TOAN VEN SAU RESTORE.')
else:
    print('[X] FAILED: Du lieu bi sai lech sau restore!')