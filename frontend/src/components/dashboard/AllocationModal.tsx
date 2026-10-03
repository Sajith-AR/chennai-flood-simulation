import React, { useState, useEffect } from 'react';
import { WarehouseEntity, InventoryStatus, ResourceAllocateRequest } from '@/lib/types';
import { X, Droplets, Package, HeartPulse, Send, Warehouse, CheckCircle2 } from 'lucide-react';

interface AllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetName: string;
  targetType: 'shelter' | 'point';
  warehouses: WarehouseEntity[];
  inventory: InventoryStatus;
  onConfirmAllocate: (request: ResourceAllocateRequest) => Promise<void>;
}

export default function AllocationModal({
  isOpen,
  onClose,
  targetId,
  targetName,
  targetType,
  warehouses,
  inventory,
  onConfirmAllocate
}: AllocationModalProps) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(warehouses.length > 0 ? warehouses[0].id : '');
  const [waterLitres, setWaterLitres] = useState<number>(5000);
  const [foodRations, setFoodRations] = useState<number>(2500);
  const [medicalKits, setMedicalKits] = useState<number>(50);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState('');
  useEffect(() => { setErrorMessage(''); setSuccessMessage(''); }, [isOpen, targetId]);

  // Fix #14: Close modal on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      await onConfirmAllocate({
        shelter_or_point_id: targetId,
        warehouse_id: selectedWarehouseId,
        supplies: {
          water_litres: waterLitres,
          food_rations: foodRations,
          medical_kits: medicalKits
        }
      });
      setSuccessMessage('Resources allocated successfully');
      setTimeout(() => {
        setSuccessMessage('');
        setIsSubmitting(false);
        onClose();
      }, 2000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Allocation failed.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-fade-in" onClick={!isSubmitting ? onClose : undefined} />
      
      <div className="relative w-full max-w-lg glass-panel-strong rounded-2xl shadow-2xl animate-scale-in flex flex-col overflow-hidden border border-slate-800">
        {successMessage ? (
          <div className="p-12 flex flex-col items-center justify-center animate-fade-in">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
              <CheckCircle2 className="w-20 h-20 text-emerald-400 relative z-10 animate-scale-in" />
            </div>
            <h3 className="mt-6 text-xl font-medium text-slate-100">{successMessage}</h3>
            <p className="mt-2 text-sm text-slate-400">Dispatch in progress</p>
          </div>
        ) : (
          <>
            <div className="p-5 flex items-center justify-between border-b border-slate-800/50 bg-slate-900/30">
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <Send className="w-5 h-5 text-cyan-400" />
                Allocate to {targetName}
              </h2>
              <button 
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
              {errorMessage && <p role="alert" className="text-sm text-red-300">{errorMessage}</p>}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Warehouse className="w-4 h-4" /> Source Depot
                </h3>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700 text-slate-200 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-5">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                  Supply Quantities
                </h3>
                
                {/* Water Slider */}
                <div className="space-y-2 p-4 bg-slate-900/40 rounded-xl border border-slate-800/50">
                  <div className="flex justify-between items-end">
                    <label className="text-sm text-slate-300 flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-cyan-400" /> Water (L)
                    </label>
                    <span className="text-lg font-mono font-medium text-cyan-400">{waterLitres.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={inventory.available_water_litres}
                    step="100"
                    value={waterLitres}
                    onChange={(e) => setWaterLitres(Number(e.target.value))}
                    className="w-full slider-cyan"
                  />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>0</span>
                    <span>Available: {inventory.available_water_litres.toLocaleString()} L</span>
                  </div>
                </div>

                {/* Food Slider */}
                <div className="space-y-2 p-4 bg-slate-900/40 rounded-xl border border-slate-800/50">
                  <div className="flex justify-between items-end">
                    <label className="text-sm text-slate-300 flex items-center gap-2">
                      <Package className="w-4 h-4 text-amber-400" /> Food (pkg)
                    </label>
                    <span className="text-lg font-mono font-medium text-amber-400">{foodRations.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={inventory.available_food_rations}
                    step="50"
                    value={foodRations}
                    onChange={(e) => setFoodRations(Number(e.target.value))}
                    className="w-full slider-amber"
                  />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>0</span>
                    <span>Available: {inventory.available_food_rations.toLocaleString()} pkg</span>
                  </div>
                </div>

                {/* Medical Slider */}
                <div className="space-y-2 p-4 bg-slate-900/40 rounded-xl border border-slate-800/50">
                  <div className="flex justify-between items-end">
                    <label className="text-sm text-slate-300 flex items-center gap-2">
                      <HeartPulse className="w-4 h-4 text-red-400" /> Medical (kits)
                    </label>
                    <span className="text-lg font-mono font-medium text-red-400">{medicalKits.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={inventory.available_medical_kits}
                    step="5"
                    value={medicalKits}
                    onChange={(e) => setMedicalKits(Number(e.target.value))}
                    className="w-full slider-red"
                  />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>0</span>
                    <span>Available: {inventory.available_medical_kits.toLocaleString()} kits</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-800/50 bg-slate-900/30 flex justify-end gap-3">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-300 border border-slate-700 hover:bg-slate-800 hover:text-slate-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || (waterLitres === 0 && foodRations === 0 && medicalKits === 0)}
                className="px-5 py-2.5 rounded-lg text-sm font-medium bg-cyan-600 text-white shadow-glow-cyan hover:bg-cyan-500 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 disabled:shadow-none flex items-center gap-2"
              >
                {isSubmitting ? 'Dispatching...' : 'Confirm Allocation'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
