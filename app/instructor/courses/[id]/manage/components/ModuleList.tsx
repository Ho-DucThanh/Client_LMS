import React from "react";

interface ModuleListProps {
  modules: any[];
  selectedModuleId: number | null;
  setSelectedModuleId: (id: number) => void;
  showModuleForm: boolean;
  setShowModuleForm: (show: boolean) => void;
  moduleTitle: string;
  setModuleTitle: (title: string) => void;
  createModule: () => void;
  editModule: (mod: any) => void;
  deleteModule: (id: number) => void;
  moveModule: (id: number, dir: "up" | "down") => void;
}

const ModuleList: React.FC<ModuleListProps> = ({
  modules,
  selectedModuleId,
  setSelectedModuleId,
  showModuleForm,
  setShowModuleForm,
  moduleTitle,
  setModuleTitle,
  createModule,
  editModule,
  deleteModule,
  moveModule,
}) => (
  <div className="bg-white rounded-lg shadow-sm p-5">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Modules</h2>
        <p className="text-sm text-gray-500">
          Organize your course with modules
        </p>
      </div>
      <div>
        <button
          onClick={() => setShowModuleForm(!showModuleForm)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md shadow-sm text-sm"
        >
          {showModuleForm ? "Close" : "+ Add module"}
        </button>
      </div>
    </div>

    {showModuleForm && (
      <div className="mb-4 bg-gray-50 border border-gray-100 rounded-md p-3">
        <div className="flex gap-2">
          <input
            value={moduleTitle}
            onChange={(e) => setModuleTitle(e.target.value)}
            placeholder="Module title"
            className="flex-1 border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <button
            onClick={createModule}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md shadow-sm"
          >
            Save
          </button>
        </div>
      </div>
    )}

    <ul className="space-y-3">
      {modules.map((m, i) => (
        <li
          key={m.id}
          className="flex items-center justify-between gap-3 p-3 rounded-md hover:shadow-sm transition"
        >
          <button
            className={`flex-1 text-left px-3 py-2 rounded-md transition ${
              selectedModuleId === m.id
                ? "bg-blue-50 border border-blue-100"
                : ""
            }`}
            onClick={() => setSelectedModuleId(m.id)}
            title={`Order: ${m.order_index ?? i + 1}`}
          >
            <div className="font-medium text-gray-800">{m.title}</div>
            <div className="text-xs text-gray-500">Module #{m.id}</div>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => editModule(m)}
              className="px-3 py-1 text-sm rounded-md border bg-white hover:bg-gray-50"
              title="Edit"
            >
              Edit
            </button>
            <button
              onClick={() => deleteModule(m.id)}
              className="px-3 py-1 text-sm rounded-md border text-red-600 bg-white hover:bg-gray-50"
              title="Delete"
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  </div>
);

export default ModuleList;
