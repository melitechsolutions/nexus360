import { useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";

export default function DarkMode() {
  const [theme, setTheme] = useState("auto");

  const modes = [
    { id: "light", name: "Light Mode", icon: Sun, bg: "bg-white", desc: "Bright interface optimal for daytime" },
    { id: "dark", name: "Dark Mode", icon: Moon, bg: "bg-gray-900", desc: "Dark interface reduces eye strain" },
    { id: "auto", name: "Auto", icon: Monitor, bg: "bg-gray-500", desc: "Switches based on system preference" },
  ];

  return (
    <ModuleLayout
      title="Dark Mode"
      icon={<Moon className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Settings" }, { label: "Dark Mode" }]}
    >
      <div>
        <p className="text-gray-600 mt-2">Customize theme preferences and appearance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setTheme(mode.id)}
            className={`p-6 rounded-lg border-2 transition ${
              theme === mode.id 
                ? "border-blue-500 bg-blue-50" 
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <mode.icon className="w-8 h-8 text-gray-900 mb-3" />
            <h3 className="font-semibold text-gray-900">{mode.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{mode.desc}</p>
          </button>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Appearance Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Sync with System</label>
            <input type="checkbox" defaultChecked className="w-4 h-4" />
            <p className="text-sm text-gray-500 mt-2">Use system theme preference</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Brightness</label>
            <input type="range" min="0" max="100" defaultValue="75" className="w-full" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Accent Color</label>
            <div className="flex gap-2">
              {["blue", "purple", "pink", "green"].map((color) => (
                <div key={color} className={`w-8 h-8 rounded-full cursor-pointer border-2 border-gray-300`} 
                  style={{ backgroundColor: `var(--color-${color})` }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-md">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Light Mode Preview</h2>
          <div className="bg-white border border-gray-300 rounded p-4 space-y-2">
            <p className="text-gray-900">This is how your interface looks in light mode</p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded">Primary Button</button>
          </div>
        </div>

        <div className="bg-gray-900 p-6 rounded-lg border-2 border-gray-700 shadow-md">
          <h2 className="text-xl font-bold text-white mb-4">Dark Mode Preview</h2>
          <div className="bg-gray-800 border border-gray-600 rounded p-4 space-y-2">
            <p className="text-white">This is how your interface looks in dark mode</p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded">Primary Button</button>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Usage Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Light Mode", value: "45%", users: "2,847" },
            { label: "Dark Mode", value: "42%", users: "2,623" },
            { label: "Auto", value: "13%", users: "812" },
          ].map((stat, idx) => (
            <div key={idx} className="p-4 bg-gray-50 rounded border border-gray-200">
              <p className="text-sm font-semibold text-gray-700">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
              <p className="text-xs text-gray-600">{stat.users} users</p>
            </div>
          ))}
        </div>
      </div>
    </ModuleLayout>
  );
}
