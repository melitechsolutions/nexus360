import { useState } from "react";
import { Palette, Grid3x3, Moon, Zap } from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";

export default function DesignSystem() {
  const colors = [
    { name: "Primary", hex: "#3B82F6", light: "#93C5FD", dark: "#1D4ED8" },
    { name: "Success", hex: "#10B981", light: "#A7F3D0", dark: "#047857" },
    { name: "Warning", hex: "#F59E0B", light: "#FDE68A", dark: "#B45309" },
    { name: "Error", hex: "#EF4444", light: "#FCA5A5", dark: "#DC2626" },
  ];

  return (
    <ModuleLayout
      title="Design System"
      icon={<Palette className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Tools" }, { label: "Design System" }]}
    >
      <div className="bg-white p-6 rounded-lg border-2 border-indigo-200 shadow-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Color Palette</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {colors.map((color) => (
            <div key={color.name} className="space-y-2">
              <div className="flex gap-2">
                <div style={{ backgroundColor: color.light }} className="flex-1 h-12 rounded border-2 border-gray-200" />
                <div style={{ backgroundColor: color.hex }} className="flex-1 h-12 rounded border-2 border-gray-200" />
                <div style={{ backgroundColor: color.dark }} className="flex-1 h-12 rounded border-2 border-gray-200" />
              </div>
              <p className="text-sm font-semibold text-gray-900">{color.name}</p>
              <p className="text-xs font-mono text-gray-600">{color.hex}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border-2 border-indigo-200 shadow-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Typography</h2>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-gray-600 mt-1">32px • Bold • Inter</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Heading 2</h2>
            <p className="text-xs text-gray-600 mt-1">24px • Semibold • Inter</p>
          </div>
          <div>
            <p className="text-base text-gray-700">Body text for all content</p>
            <p className="text-xs text-gray-600 mt-1">16px • Regular • Inter</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Small text for secondary content</p>
            <p className="text-xs text-gray-600 mt-1">14px • Regular • Inter</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border-2 border-indigo-200 shadow-md">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Spacing Scale</h2>
          <div className="space-y-2">
            {[8, 16, 24, 32, 48, 64].map((px) => (
              <div key={px} className="flex items-center gap-4">
                <div style={{ width: px, height: 32 }} className="bg-indigo-500 rounded" />
                <span className="text-sm text-gray-600 font-mono">{px}px</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border-2 border-indigo-200 shadow-md">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Border Radius</h2>
          <div className="space-y-3">
            {[
              { radius: 4, label: "Small" },
              { radius: 8, label: "Medium" },
              { radius: 12, label: "Large" },
              { radius: 9999, label: "Full" },
            ].map((item) => (
              <div key={item.radius} className="flex items-center gap-4">
                <div style={{ borderRadius: item.radius }} className="w-16 h-16 bg-indigo-100 border-2 border-indigo-300" />
                <p className="text-sm text-gray-700">{item.label} ({item.radius}px)</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border-2 border-indigo-200 shadow-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Component Variants</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Primary Button", bg: "bg-blue-600", text: "text-white" },
            { label: "Secondary Button", bg: "bg-gray-200", text: "text-gray-900" },
            { label: "Danger Button", bg: "bg-red-600", text: "text-white" },
            { label: "Success Button", bg: "bg-green-600", text: "text-white" },
          ].map((btn, idx) => (
            <button key={idx} className={`${btn.bg} ${btn.text} px-4 py-2 rounded font-semibold transition hover:opacity-90`}>
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </ModuleLayout>
  );
}
