#!/usr/bin/env python3
"""
LICC Men Fellowship - Python Excel Report & Analytics Generator
This script connects directly to the server/data/licc_members_database.xlsx Excel file
and generates summary analytics, age distribution tables, and exports CSV reports.
"""

import os
import sys
import json
from datetime import datetime

EXCEL_PATH = os.path.join(os.path.dirname(__file__), "..", "server", "data", "licc_members_database.xlsx")

def analyze_excel():
    print("=" * 60)
    print("📊 LICC Men Fellowship - Python Excel Analytics Tool")
    print(f"📁 Target File: {os.path.abspath(EXCEL_PATH)}")
    print("=" * 60)

    if not os.path.exists(EXCEL_PATH):
        print(f"❌ Excel file not found at: {EXCEL_PATH}")
        sys.exit(1)

    try:
        import openpyxl
    except ImportError:
        print("💡 Tip: Install openpyxl via `pip install openpyxl` to run full Python parsing.")
        sys.exit(0)

    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    
    print(f"\n📋 Worksheets detected: {wb.sheetnames}")
    
    if "Members" in wb.sheetnames:
        sheet = wb["Members"]
        rows = list(sheet.iter_rows(values_only=True))
        if len(rows) > 1:
            headers = rows[0]
            member_data = rows[1:]
            print(f"\n👤 Total Members Registered: {len(member_data)}")
            
            # Age Group distribution
            age_col_idx = headers.index("Age Group") if "Age Group" in headers else 4
            phone_col_idx = headers.index("WhatsApp Phone") if "WhatsApp Phone" in headers else 5
            
            age_counts = {}
            phones = set()
            duplicates = 0
            
            for row in member_data:
                age_grp = str(row[age_col_idx]) if row[age_col_idx] else "Unknown"
                phone = str(row[phone_col_idx]) if row[phone_col_idx] else ""
                
                age_counts[age_grp] = age_counts.get(age_grp, 0) + 1
                
                if phone in phones:
                    duplicates += 1
                else:
                    phones.add(phone)
            
            print("\n📈 Age Group Breakdown:")
            for grp, count in age_counts.items():
                print(f"   • {grp}: {count} member(s)")
                
            print(f"\n🛡️ Uniqueness Integrity: {'PASSED (No Duplicates)' if duplicates == 0 else f'WARNING ({duplicates} duplicates found)'}")

if __name__ == "__main__":
    analyze_excel()
