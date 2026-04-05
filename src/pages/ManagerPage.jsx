import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import moment from 'moment';

export default function ManagerPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [assignedDealer, setAssignedDealer] = useState("");

  useEffect(() => {
    document.title = "매니저 대시보드";
    const authData = Auth.getAuthData();
    setUserName(authData?.dealer_name || "");
    setAssignedDealer(localStorage.getItem("sf_assigned_dealer") || "");
  }, []);

  const handleDownload = async () => {
    if (!assignedDealer) {
      toast.error("담당 대리점 정보가 없습니다.");
      return;
    }

    setLoading(true);
    try {
      const salesRecords = await base44.entities.SalesRecord.filter({ dealer_name: assignedDealer });

      const data = salesRecords.map(record => ({
        '날짜': record.sale_date || "",
        '고객명': record.customer_name || "",
        '연락처': record.phone || "",
        '매출금액': record.sales_amount || 0,
        'SOF수량': record.final_quantity || 0,
        '지갑주소': record.wallet_address || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "매출현황");

      const yearMonth = moment().format('YYYY-MM');
      const fileName = `${assignedDealer}매출현황${yearMonth}.xlsx`;

      XLSX.writeFile(workbook, fileName);
      toast.success('매출 현황이 다운로드되었습니다.');
    } catch (error) {
      toast.error('매출 현황 다운로드에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Auth.logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#080a12] text-white p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">안녕하세요 {userName}님</h1>
          <p className="text-lg text-gray-400">담당대리점 <span className="text-white font-semibold">{assignedDealer}</span></p>
        </div>

        <div className="space-y-3">
          <Button onClick={handleDownload} disabled={loading} className="w-full sf-gradient-btn h-12 text-base font-medium">
            {loading ? '다운로드 중...' : '📊 매출 현황 다운로드'}
          </Button>
          <Button onClick={handleLogout} variant="outline" className="w-full h-12 border-red-500/30 text-red-400 hover:bg-red-500/10 text-base">
            로그아웃
          </Button>
        </div>
      </div>
    </div>
  );
}