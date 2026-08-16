"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, User, Building2, MapPin, Phone, FileCheck } from "lucide-react";

interface PersonalProfile {
  id: string;
  firmName: string;
  engineerName: string;
  designation: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gst: string;
  registrationNo: string;
  defaultDistrict: string;
  defaultSORYear: string;
  boqHeaderNote: string;
  boqFooterNote: string;
}

const SOR_YEARS = ["2020-21","2021-22","2022-23","2023-24","2024-25","2025-26"];
const GUJARAT_DISTRICTS = [
  "Ahmedabad","Amreli","Anand","Aravalli","Banaskantha","Bharuch","Bhavnagar",
  "Botad","Chhota Udaipur","Dahod","Dang","Devbhoomi Dwarka","Gandhinagar",
  "Gir Somnath","Jamnagar","Junagadh","Kheda","Kutch","Mahisagar","Mehsana",
  "Morbi","Narmada","Navsari","Panchmahal","Patan","Porbandar","Rajkot",
  "Sabarkantha","Surat","Surendranagar","Tapi","Vadodara","Valsad",
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<PersonalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/personal-profile")
      .then((r) => r.json())
      .then((data) => { setProfile(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleChange = (field: keyof PersonalProfile, value: string) => {
    setProfile((p) => p ? { ...p, [field]: value } : p);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const res = await fetch("/api/personal-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
  };

  if (loading) return <div className="flex items-center justify-center h-48 text-slate-400">Loading...</div>;
  if (!profile) return <div className="text-red-500">Failed to load profile.</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>
          <p className="text-sm text-slate-500 mt-0.5">Personal firm details used in BOQ headers, DTP documents, and exports</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : saved ? "Saved!" : "Save Profile"}
        </Button>
      </div>

      {/* Firm Info */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1">
          <Building2 className="w-4 h-4 text-blue-600" /> Firm Information
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-slate-500 mb-1 block">Firm / Company Name</label>
            <Input value={profile.firmName} onChange={(e) => handleChange("firmName", e.target.value)} placeholder="e.g. R.K. Contractors" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Engineer Name</label>
            <Input value={profile.engineerName} onChange={(e) => handleChange("engineerName", e.target.value)} placeholder="Your full name" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Designation</label>
            <Input value={profile.designation} onChange={(e) => handleChange("designation", e.target.value)} placeholder="e.g. Civil Engineer" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">GST Number</label>
            <Input value={profile.gst} onChange={(e) => handleChange("gst", e.target.value)} placeholder="22AAAAA0000A1Z5" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Registration No.</label>
            <Input value={profile.registrationNo} onChange={(e) => handleChange("registrationNo", e.target.value)} placeholder="License / Reg. No." />
          </div>
        </div>
      </Card>

      {/* Contact */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1">
          <Phone className="w-4 h-4 text-blue-600" /> Contact Details
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Phone</label>
            <Input value={profile.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="+91 98765 43210" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Email</label>
            <Input value={profile.email} onChange={(e) => handleChange("email", e.target.value)} placeholder="you@example.com" />
          </div>
        </div>
      </Card>

      {/* Address */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1">
          <MapPin className="w-4 h-4 text-blue-600" /> Address
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-slate-500 mb-1 block">Street Address</label>
            <Input value={profile.address} onChange={(e) => handleChange("address", e.target.value)} placeholder="Office / Site address" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">City</label>
            <Input value={profile.city} onChange={(e) => handleChange("city", e.target.value)} placeholder="City" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">State</label>
            <Input value={profile.state} onChange={(e) => handleChange("state", e.target.value)} placeholder="Gujarat" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Pincode</label>
            <Input value={profile.pincode} onChange={(e) => handleChange("pincode", e.target.value)} placeholder="380001" />
          </div>
        </div>
      </Card>

      {/* Defaults */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1">
          <User className="w-4 h-4 text-blue-600" /> Default Estimation Settings
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Default District</label>
            <select
              value={profile.defaultDistrict}
              onChange={(e) => handleChange("defaultDistrict", e.target.value)}
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {GUJARAT_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Default SOR Year</label>
            <select
              value={profile.defaultSORYear}
              onChange={(e) => handleChange("defaultSORYear", e.target.value)}
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SOR_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* BOQ Notes */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1">
          <FileCheck className="w-4 h-4 text-blue-600" /> BOQ Document Notes
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Header Note (appears at top of every BOQ)</label>
            <textarea
              value={profile.boqHeaderNote}
              onChange={(e) => handleChange("boqHeaderNote", e.target.value)}
              rows={2}
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="e.g. As per Gujarat SOR 2024-25, all rates inclusive of labour and material."
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Footer Note (appears at bottom of every BOQ)</label>
            <textarea
              value={profile.boqFooterNote}
              onChange={(e) => handleChange("boqFooterNote", e.target.value)}
              rows={2}
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="e.g. All measurements subject to field verification. GST extra as applicable."
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
