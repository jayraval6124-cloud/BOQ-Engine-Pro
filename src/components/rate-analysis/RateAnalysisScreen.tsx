"use client";

import React, { useState, useRef } from "react";
import { useRateAnalysisController } from "./RateAnalysisController";
import { formatCurrency } from "../../lib/utils";
import { 
  Calculator, Download, FileSpreadsheet, Upload, 
  Search, Plus, Trash2, LineChart, Table2, Layers, Save
} from "lucide-react";

export function RateAnalysisScreen({ projectId }: { projectId?: string }) {
  const ctrl = useRateAnalysisController(projectId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMultiAddOpen, setIsMultiAddOpen] = useState(false);
  const [multiAddText, setMultiAddText] = useState("");

  const active = ctrl.activeItem;

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden bg-slate-50">
      {/* Header & Export Options */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <LineChart className="w-6 h-6 text-blue-600" /> Rate Analysis Engine
          </h1>
          <p className="text-sm text-slate-500">Calculate tender rates and build resource estimates.</p>
        </div>
        <div className="flex gap-2">
          {ctrl.projectId && (
            <button 
              onClick={ctrl.saveProject}
              disabled={ctrl.isSaving}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {ctrl.isSaving ? "Saving..." : "Save Project"}
            </button>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                ctrl.handleImport(e.target.files[0]);
              }
            }}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
          >
            <Upload className="w-4 h-4" /> Import BOQ
          </button>
          <button 
            onClick={ctrl.exportExcel}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export Excel
          </button>
          <button 
            onClick={ctrl.exportPDF}
            className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
          >
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Item Selection */}
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col hide-print">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="text-sm font-bold text-slate-700 mb-3">SOR Selection</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Division</label>
                <select 
                  className="w-full text-sm border border-slate-200 rounded-md p-1.5"
                  value={ctrl.selectedDivision}
                  onChange={(e) => ctrl.setSelectedDivision(e.target.value)}
                >
                  <option value="">Select Division</option>
                  {ctrl.divisions.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">SOR Year</label>
                <select 
                  className="w-full text-sm border border-slate-200 rounded-md p-1.5"
                  value={ctrl.selectedYear}
                  onChange={(e) => ctrl.setSelectedYear(e.target.value)}
                >
                  <option value="">Select Year</option>
                  {ctrl.sorYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Search GSRTC Code</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="e.g. 1.1"
                    className="flex-1 text-sm border border-slate-200 rounded-md p-1.5"
                    value={ctrl.itemSearchText}
                    onChange={(e) => ctrl.setItemSearchText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && ctrl.searchSorItems(ctrl.itemSearchText)}
                  />
                  <button 
                    onClick={() => ctrl.searchSorItems(ctrl.itemSearchText)}
                    className="p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
                <button 
                  onClick={() => setIsMultiAddOpen(true)}
                  className="mt-2 w-full flex items-center justify-center gap-1 p-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200"
                >
                  <Plus className="w-3 h-3" /> Bulk Add Codes
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {ctrl.loadingItems ? (
              <div className="text-center p-4 text-slate-500 text-sm">Searching...</div>
            ) : ctrl.sorItems.length === 0 ? (
              <div className="text-center p-4 text-slate-400 text-xs">No items found. Search to begin.</div>
            ) : (
              <div className="space-y-2">
                {ctrl.sorItems.map(item => (
                  <button 
                    key={item.id}
                    onClick={() => ctrl.selectSorItem(item)}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-sm text-slate-800">{item.itemCode}</span>
                      <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{item.unit}</span>
                    </div>
                    <div className="text-xs text-slate-500 line-clamp-2 mb-2">{item.description}</div>
                    <div className="text-sm font-semibold text-blue-700">{formatCurrency(Number(item.rate))}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-y-auto print-full-width">
          {!active ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 hide-print">
              <Calculator className="w-12 h-12 mb-4 opacity-20" />
              <p>Select an item from the left or import a BOQ to start Rate Analysis</p>
            </div>
          ) : (
            <div className="p-6 max-w-5xl mx-auto w-full space-y-6">

              {/* Project & Agency Settings */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hide-print">
                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-blue-500" /> Project Details & Global Settings
                </h3>
                
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-5">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Name of Work</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Construction of Primary School"
                      className="w-full text-sm border border-slate-200 rounded-md p-2"
                      value={ctrl.projectName}
                      onChange={(e) => ctrl.setProjectName(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Name of Agency</label>
                    <input 
                      type="text" 
                      placeholder="e.g. ABC Construction Co."
                      className="w-full text-sm border border-slate-200 rounded-md p-2"
                      value={ctrl.agencyName}
                      onChange={(e) => ctrl.setAgencyName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-4 border-t border-slate-100">
                  <div className="flex gap-2 w-48">
                    <button 
                      onClick={() => ctrl.updateGlobalAboveBelow("Above", ctrl.globalAboveBelowPercent)}
                      className={`flex-1 py-2 text-sm font-medium rounded-md border ${ctrl.globalAboveBelowType === "Above" ? "bg-red-50 border-red-200 text-red-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                    >
                      Above (+)
                    </button>
                    <button 
                      onClick={() => ctrl.updateGlobalAboveBelow("Below", ctrl.globalAboveBelowPercent)}
                      className={`flex-1 py-2 text-sm font-medium rounded-md border ${ctrl.globalAboveBelowType === "Below" ? "bg-green-50 border-green-200 text-green-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                    >
                      Below (-)
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-600">Percentage (%):</label>
                    <input 
                      type="number"
                      className="w-24 border border-slate-200 rounded-md p-2 text-sm"
                      value={ctrl.globalAboveBelowPercent}
                      onChange={(e) => ctrl.updateGlobalAboveBelow(ctrl.globalAboveBelowType, parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
              
              {/* Active Item Header */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-blue-100 text-blue-800 text-sm font-bold px-2.5 py-1 rounded">Code: {active.gsrtcCode}</span>
                      <span className="text-slate-500 text-sm font-medium">Unit: {active.unit}</span>
                    </div>
                    <h2 className="text-lg font-semibold text-slate-800">{active.description}</h2>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-500 font-medium mb-1">SOR Rate</div>
                    <div className="text-2xl font-bold text-slate-800">{formatCurrency(active.sorRate)}</div>
                  </div>
                </div>
              </div>

              {/* Estimation Interface */}
              <div className="grid grid-cols-12 gap-6">
                
                {/* Left Side: Summary */}
                <div className="col-span-12 md:col-span-4 space-y-6 hide-print">
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-500" /> Analysis Summary
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Material</span>
                        <span className="font-medium text-slate-800">{formatCurrency(active.components.filter(c => c.type==="MATERIAL").reduce((s,c)=>s+c.amount,0))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Labour</span>
                        <span className="font-medium text-slate-800">{formatCurrency(active.components.filter(c => c.type==="LABOUR").reduce((s,c)=>s+c.amount,0))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Machinery</span>
                        <span className="font-medium text-slate-800">{formatCurrency(active.components.filter(c => c.type==="MACHINERY").reduce((s,c)=>s+c.amount,0))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Overhead/Other</span>
                        <span className="font-medium text-slate-800">{formatCurrency(active.components.filter(c => c.type==="OVERHEAD" || c.type==="OTHER").reduce((s,c)=>s+c.amount,0))}</span>
                      </div>
                      <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                        <span className="font-bold text-slate-800">Analysis Cost</span>
                        <span className="font-bold text-purple-600">{formatCurrency(active.analysisCost)}</span>
                      </div>
                      <div className={`pt-2 flex justify-between items-center ${active.profitLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                        <span className="font-bold text-sm">Profit / Loss</span>
                        <span className="font-bold">{formatCurrency(active.profitLoss)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Detailed Resource Breakup */}
                <div className="col-span-12 md:col-span-8">
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-700">Detailed Resource Breakup</h3>
                      <div className="flex gap-2 hide-print">
                        <button onClick={() => ctrl.addComponent("MATERIAL")} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded hover:bg-blue-200">+ Material</button>
                        <button onClick={() => ctrl.addComponent("LABOUR")} className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded hover:bg-emerald-200">+ Labour</button>
                        <button onClick={() => ctrl.addComponent("MACHINERY")} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded hover:bg-purple-200">+ Machine</button>
                        <button onClick={() => ctrl.addComponent("OVERHEAD")} className="px-2 py-1 bg-slate-200 text-slate-700 text-xs font-semibold rounded hover:bg-slate-300">+ Other</button>
                      </div>
                    </div>
                    
                    <div className="p-0">
                      <table className="w-full text-sm">
                        <thead className="bg-white text-slate-500 border-b border-slate-100">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium w-24">Type</th>
                            <th className="px-4 py-3 text-left font-medium">Description</th>
                            <th className="px-4 py-3 text-right font-medium w-20">Qty</th>
                            <th className="px-4 py-3 text-left font-medium w-16">Unit</th>
                            <th className="px-4 py-3 text-right font-medium w-24">Rate</th>
                            <th className="px-4 py-3 text-right font-medium w-24">Amount</th>
                            <th className="px-4 py-3 text-center font-medium w-10 hide-print"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {active.components.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="text-center py-8 text-slate-400">No resources added. Click the buttons above to add.</td>
                            </tr>
                          ) : (
                            active.components.map((c, i) => (
                              <tr key={i} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-2">
                                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                    c.type === 'MATERIAL' ? 'bg-blue-100 text-blue-700' :
                                    c.type === 'LABOUR' ? 'bg-emerald-100 text-emerald-700' :
                                    c.type === 'MACHINERY' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                                  }`}>{c.type}</span>
                                </td>
                                <td className="px-4 py-2">
                                  <input type="text" className="w-full border-b border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent py-1 outline-none transition-colors" value={c.description} onChange={e => ctrl.updateComponent(i, "description", e.target.value)} placeholder="Item name..." />
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <input type="number" className="w-full text-right border-b border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent py-1 outline-none" value={c.quantity} onChange={e => ctrl.updateComponent(i, "quantity", parseFloat(e.target.value)||0)} />
                                </td>
                                <td className="px-4 py-2">
                                  <input type="text" className="w-full border-b border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent py-1 outline-none" value={c.unit} onChange={e => ctrl.updateComponent(i, "unit", e.target.value)} placeholder="Unit" />
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <input type="number" className="w-full text-right border-b border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent py-1 outline-none" value={c.rate} onChange={e => ctrl.updateComponent(i, "rate", parseFloat(e.target.value)||0)} />
                                </td>
                                <td className="px-4 py-2 text-right font-medium text-slate-700">
                                  {formatCurrency(c.amount)}
                                </td>
                                <td className="px-4 py-2 text-center hide-print">
                                  <button onClick={() => ctrl.removeComponent(i)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4 mx-auto" /></button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t border-slate-200">
                          <tr>
                            <td colSpan={5} className="px-4 py-3 text-right font-bold text-slate-700">Total Analysis Cost:</td>
                            <td className="px-4 py-3 text-right font-bold text-purple-700 text-base">{formatCurrency(active.analysisCost)}</td>
                            <td className="hide-print"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comparison Section */}
              {ctrl.comparisonItems.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 mt-8 overflow-hidden print-break-before">
                  <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                      <Table2 className="w-4 h-4 text-blue-500" /> Comparison Overview
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-white border-b border-slate-200 text-slate-500 font-medium">
                        <tr>
                          <th className="px-4 py-3 whitespace-nowrap">Item No</th>
                          <th className="px-4 py-3 whitespace-nowrap">Code</th>
                          <th className="px-4 py-3 min-w-[200px]">Description</th>
                          <th className="px-4 py-3 text-right whitespace-nowrap">BOQ Qty</th>
                          <th className="px-4 py-3 text-center whitespace-nowrap">Unit</th>
                          <th className="px-4 py-3 text-right whitespace-nowrap">Tender Rate</th>
                          <th className="px-4 py-3 text-right whitespace-nowrap">Tender Amt</th>
                          <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-100">Agency Rate</th>
                          <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-100">Agency Amt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {ctrl.comparisonItems.map(c => (
                          <tr key={c.id} className={`hover:bg-slate-50 cursor-pointer ${active.id === c.id ? 'bg-blue-50/50' : ''}`} onClick={() => ctrl.setActiveItem(c)}>
                            <td className="px-4 py-3 text-slate-600">{c.itemNumber || '-'}</td>
                            <td className="px-4 py-3 font-semibold text-slate-700">{c.gsrtcCode}</td>
                            <td className="px-4 py-3 text-slate-600 line-clamp-1" title={c.description}>{c.description}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{c.boqQty || '-'}</td>
                            <td className="px-4 py-3 text-center text-slate-500 text-xs">{c.unit}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(c.tenderRate)}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{c.tenderAmount !== undefined ? formatCurrency(c.tenderAmount) : '-'}</td>
                            <td className="px-4 py-3 text-right font-medium text-slate-800 bg-slate-50">{formatCurrency(c.agencyRate)}</td>
                            <td className="px-4 py-3 text-right font-medium text-slate-800 bg-slate-50">{c.agencyAmount !== undefined ? formatCurrency(c.agencyAmount) : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
      
      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .hide-print { display: none !important; }
          .print-full-width { width: 100% !important; flex: none !important; }
          .print-break-before { page-break-before: always; }
          body { background: white; }
          * { overflow: visible !important; }
          input { border: none !important; padding: 0 !important; background: transparent !important; }
        }
      `}} />

      {/* Bulk Add Modal */}
      {isMultiAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Bulk Add GSRTC Codes</h2>
            <p className="text-sm text-slate-600 mb-4">
              Paste your GSRTC codes below (separated by commas or new lines).
            </p>
            <textarea 
              className="w-full h-40 border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              placeholder="e.g. RJ001, RJ012, RJ030..."
              value={multiAddText}
              onChange={(e) => setMultiAddText(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsMultiAddOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  const codes = multiAddText.split(/[\s,]+/).filter(Boolean);
                  ctrl.addMultipleCodes(codes);
                  setIsMultiAddOpen(false);
                  setMultiAddText("");
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={!multiAddText.trim()}
              >
                Add {multiAddText.split(/[\s,]+/).filter(Boolean).length} Codes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
