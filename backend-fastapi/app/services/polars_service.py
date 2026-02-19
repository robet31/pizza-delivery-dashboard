import polars as pl
from typing import Dict, Any, List, Optional
from datetime import datetime
import io


class PolarsDataProcessor:
    """Service untuk memproses data menggunakan Polars"""

    @staticmethod
    def read_excel_file(
        file_content: bytes, sheet_name: str = "Sheet1"
    ) -> pl.DataFrame:
        """Membaca file Excel dan mengkonversi ke Polars DataFrame"""
        df = pl.read_excel(
            source=io.BytesIO(file_content), sheet_name=sheet_name, has_header=True
        )
        return df

    @staticmethod
    def read_csv_file(file_content: bytes, separator: str = ",") -> pl.DataFrame:
        """Membaca file CSV dan mengkonversi ke Polars DataFrame"""
        df = pl.read_csv(source=io.BytesIO(file_content), separator=separator)
        return df

    @staticmethod
    def clean_delivery_data(df: pl.DataFrame) -> pl.DataFrame:
        """Membersihkan data delivery"""
        # Hapus baris dengan nilai null
        cleaned = df.drop_nulls()

        # Konversi tipe data
        columns = cleaned.columns
        if "order_time" in columns:
            cleaned = cleaned.with_columns(
                [pl.col("order_time").str.to_datetime("%Y-%m-%d %H:%M:%S")]
            )

        if "delivery_time" in cleaned.columns:
            cleaned = cleaned.with_columns(
                [pl.col("delivery_time").str.to_datetime("%Y-%m-%d %H:%M:%S")]
            )

        return cleaned

    @staticmethod
    def get_sales_summary(df: pl.DataFrame) -> Dict[str, Any]:
        """Mendapatkan ringkasan penjualan"""
        if df.is_empty():
            return {
                "total_orders": 0,
                "total_revenue": 0,
                "average_order": 0,
                "min_order": 0,
                "max_order": 0,
            }

        return {
            "total_orders": len(df),
            "total_revenue": float(df["estimated_duration"].sum())
            if "estimated_duration" in df.columns
            else 0,
            "average_order": float(df["estimated_duration"].mean())
            if "estimated_duration" in df.columns
            else 0,
            "min_order": float(df["estimated_duration"].min())
            if "estimated_duration" in df.columns
            else 0,
            "max_order": float(df["estimated_duration"].max())
            if "estimated_duration" in df.columns
            else 0,
        }

    @staticmethod
    def get_delivery_performance(df: pl.DataFrame) -> Dict[str, Any]:
        """Mendapatkan performa delivery"""
        if df.is_empty():
            return {"total_deliveries": 0, "on_time": 0, "delayed": 0, "delay_rate": 0}

        if "is_delayed" not in df.columns:
            return {"error": "is_delayed column not found"}

        total = len(df)
        delayed = df.filter(pl.col("is_delayed") == True)
        on_time = df.filter(pl.col("is_delayed") == False)

        return {
            "total_deliveries": total,
            "on_time": len(on_time),
            "delayed": len(delayed),
            "delay_rate": round(len(delayed) / total * 100, 2) if total > 0 else 0,
        }

    @staticmethod
    def get_orders_by_hour(df: pl.DataFrame) -> List[Dict[str, Any]]:
        """Mendapatkan jumlah order per jam"""
        if df.is_empty() or "order_hour" not in df.columns:
            return []

        result = (
            df.group_by("order_hour")
            .agg([pl.len().alias("order_count")])
            .sort("order_hour")
        )

        return [
            {"hour": row["order_hour"], "count": row["order_count"]}
            for row in result.iter_rows()
        ]

    @staticmethod
    def get_orders_by_month(df: pl.DataFrame) -> List[Dict[str, Any]]:
        """Mendapatkan jumlah order per bulan"""
        if df.is_empty() or "order_month" not in df.columns:
            return []

        result = (
            df.group_by("order_month")
            .agg([pl.len().alias("order_count")])
            .sort("order_month")
        )

        return [
            {"month": row["order_month"], "count": row["order_count"]}
            for row in result.iter_rows()
        ]

    @staticmethod
    def get_traffic_analysis(df: pl.DataFrame) -> List[Dict[str, Any]]:
        """Analisis berdasarkan traffic level"""
        if df.is_empty() or "traffic_level" not in df.columns:
            return []

        result = df.group_by("traffic_level").agg(
            [
                pl.len().alias("order_count"),
                pl.col("is_delayed").mean().alias("delay_rate"),
            ]
        )

        return [
            {
                "traffic_level": row["traffic_level"],
                "order_count": row["order_count"],
                "delay_rate": round(row["delay_rate"] * 100, 2),
            }
            for row in result.iter_rows()
        ]

    @staticmethod
    def get_pizza_analysis(df: pl.DataFrame) -> List[Dict[str, Any]]:
        """Analisis berdasarkan pizza"""
        if df.is_empty():
            return []

        result = df.group_by(["pizza_size", "pizza_type"]).agg(
            [pl.len().alias("order_count")]
        )

        return [
            {
                "pizza_size": row["pizza_size"],
                "pizza_type": row["pizza_type"],
                "order_count": row["order_count"],
            }
            for row in result.iter_rows()
        ]

    @staticmethod
    def get_payment_analysis(df: pl.DataFrame) -> List[Dict[str, Any]]:
        """Analisis berdasarkan payment method"""
        if df.is_empty() or "payment_method" not in df.columns:
            return []

        result = df.group_by("payment_method").agg([pl.len().alias("order_count")])

        return [
            {"payment_method": row["payment_method"], "order_count": row["order_count"]}
            for row in result.iter_rows()
        ]

    @staticmethod
    def export_to_dict(df: pl.DataFrame) -> List[Dict[str, Any]]:
        """Export DataFrame ke list of dict"""
        return df.to_dicts()

    @staticmethod
    def export_to_json(df: pl.DataFrame) -> str:
        """Export DataFrame ke JSON string"""
        return df.write_json()

    @staticmethod
    def export_to_csv(df: pl.DataFrame) -> str:
        """Export DataFrame ke CSV string"""
        return df.write_csv()
