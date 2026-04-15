import { useState } from "react";
import { LayoutGrid,  Layers, Package, Copy } from "lucide-react";

const components = [
  { name: "Buttons", count: 18, variants: 54 },
  { name: "Inputs", count: 24, variants: 96 },
  { name: "Cards", count: 12, variants: 36 },
  { name: "Modals", count: 8, variants: 24 },
  { name: "Tables", count: 6, variants: 18 },
  { name: "Charts", count: 15, variants: 45 },
];

export default function ComponentLibrary() {
  const [copied, setCopied] = useState(null);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <ModuleLayout
      title="Component Library"
      icon={<LayoutGrid className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Tools" }, { label: "Component Library" }]}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Total Components", value: "83", icon: Package },
          { label: "Design Coverage", value: "94.5%", icon: Layers },
          { label: "Code Quality", value: "98.2%", icon: Copy },
        ].map((card, idx) => (
          <div key={idx} className="bg-white p-6 rounded-lg border-2 border-cyan-200 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
              </div>
              <card.icon className="w-10 h-10 text-cyan-600 opacity-20" />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg border-2 border-cyan-200 shadow-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Component Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {components.map((comp) => (
            <div key={comp.name} className="p-4 border-2 border-cyan-100 rounded-lg hover:border-cyan-300 transition">
              <p className="text-lg font-semibold text-gray-900">{comp.name}</p>
              <p className="text-sm text-gray-600 mt-1">{comp.count} components</p>
              <p className="text-xs text-gray-500 mt-1">{comp.variants} variants</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border-2 border-cyan-200 shadow-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Component Usage</h2>
        <div className="space-y-3">
          {[
            { comp: "Button", usage: 2847, lastUpdated: "2026-03-08" },
            { comp: "Input", usage: 1923, lastUpdated: "2026-03-07" },
            { comp: "Card", usage: 1456, lastUpdated: "2026-03-06" },
            { comp: "Modal", usage: 892, lastUpdated: "2026-03-05" },
            { comp: "Table", usage: 567, lastUpdated: "2026-03-04" },
          ].map((item) => (
            <div key={item.comp} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <p className="font-semibold text-gray-900">{item.comp}</p>
                <p className="text-xs text-gray-600">{item.usage} usages</p>
              </div>
              <p className="text-sm text-gray-500">{item.lastUpdated}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border-2 border-cyan-200 shadow-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Copy Component Import</h2>
        <div className="space-y-2">
          {["Button", "Input", "Card", "Modal"].map((comp) => (
            <div key={comp} className="flex items-center gap-2 p-3 bg-gray-900 text-gray-100 font-mono text-sm rounded">
              <span>import {"{" + comp + "}" + "} from '@/components';"}</span>
              <button onClick={() => handleCopy(`import { ${comp} } from '@/components';`)} className="ml-auto text-cyan-400 hover:text-cyan-300">
                {copied === `import { ${comp} } from '@/components';` ? "✓ Copied" : "Copy"}
import { ModuleLayout } from "@/components/ModuleLayout";
              </button>
            </div>
          ))}
        </div>
      </div>
    </ModuleLayout>
  );
}
