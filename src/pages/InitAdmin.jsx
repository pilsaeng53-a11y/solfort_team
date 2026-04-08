import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/neonClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const AUTH_CODE = "SOLFORT2024";

export default function InitAdmin() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [form, setForm] = useState({ name: "", username: "", password: "", confirm: "", authCode: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    base44.entities.SuperAdmin.list().then(admins => {
      if (admins.length > 0) {
        setTimeout(() => navigate("/"), 1500);
      } else {
        setChecking(false);
      }
    });
  }, []);

  const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (form.authCode !== AUTH_CODE) { setError("인증 코드가 올바르지 않습니다"); return; }
    if (!form.name || !form.username || !form.password) { setError("모든 필드를 입력하세요"); return; }
    if (form.password.length < 6) { setError("비밀번호는 6자 이상이어야 합니다"); return; }
    if (form.password !== form.confirm) { setError("비밀번호가 일치하지 않습니다"); return; }
    setError("");
    setLoading(true);
    await base44.entities.SuperAdmin.create({
      username: form.username,
      password: form.password,
      name: form.name,
      role: "super_admin",
      status: "active",
      created_at: new Date().toISOString(),
    });
    setLoading(false);
    setSuccess(true);
    setTimeout(() => navigate("/"), 3000);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto" />
          <p className="text-purple-400 text-sm">확인 중...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="text-5xl">✅</div>
          <p className="text-white text-lg font-semibold">총관리자 계정이 생성되었습니다</p>
          <p className="text-gray-500 text-sm">잠시 후 로그인 페이지로 이동합니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-xl font-bold text-white">초기 관리자 설정</h1>
          <div className="bg-red-950/50 border border-red-800/50 rounded-xl px-4 py-3">
            <p className="text-red-400 text-xs leading-relaxed">
              이 페이지는 시스템 최초 설정 시 1회만 사용 가능합니다.<br />
              총관리자 계정 생성 후 이 페이지는 자동으로 비활성화됩니다.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-zinc-950 border border-purple-900/40 rounded-2xl p-6 space-y-4">
          {[
            { key: "name", label: "총관리자 이름", placeholder: "실명 입력" },
            { key: "username", label: "아이디", placeholder: "영문+숫자" },
            { key: "password", label: "비밀번호", placeholder: "6자 이상", type: "password" },
            { key: "confirm", label: "비밀번호 확인", placeholder: "비밀번호 재입력", type: "password" },
            { key: "authCode", label: "인증 코드", placeholder: "시스템 인증 코드 입력" },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-gray-500">{f.label}</label>
              <Input
                type={f.type || "text"}
                value={form[f.key]}
                onChange={set(f.key)}
                placeholder={f.placeholder}
                className="bg-zinc-900 border-zinc-700 text-white mt-1 rounded-xl h-10 text-sm placeholder:text-zinc-600"
              />
            </div>
          ))}

          {error && (
            <p className="text-xs text-red-400 bg-red-950/50 border border-red-800/30 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-12 rounded-xl font-semibold text-white border-0"
            style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea, #a855f7)" }}
          >
            {loading ? "생성 중..." : "총관리자 계정 생성"}
          </Button>
        </div>
      </div>
    </div>
  );
}