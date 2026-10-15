import React, { useState } from 'react';
import { Tercero } from '../../types';
import { calculateDIANDV, formatNITWithDV } from '../../lib/dianUtils';
import { toast } from '../../context/ToastContext';

interface QuickClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientCreated: (client: Tercero) => void;
  addTercero?: (t: Omit<Tercero, 'id'>) => void;
}

export default function QuickClientModal({
  isOpen,
  onClose,
  onClientCreated,
  addTercero
}: QuickClientModalProps) {
  const [name, setName] = useState('');
  const [nit, setNit] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Bogotá, D.C.');
  const [address, setAddress] = useState('Dirección Comercial Principal');
  const [regimen, setRegimen] = useState<'responsable' | 'no_responsable' | 'simple'>('no_responsable');

  if (!isOpen) return null;

  const computedDV = nit.trim() ? calculateDIANDV(nit) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !nit.trim()) {
      toast.warning('Por favor ingrese la razón social o nombre y el NIT del cliente.', 'Datos Obligatorios');
      return;
    }

    const newId = `ter-${Date.now()}`;
    const formattedNit = formatNITWithDV(nit);
    const dvVal = String(calculateDIANDV(nit));

    const newTercero: Tercero = {
      id: newId,
      name: name.trim(),
      nit: formattedNit,
      dv: dvVal,
      type: 'juridica',
      roles: ['cliente'],
      city: city || 'Bogotá, D.C.',
      address: address || 'Dirección Comercial Principal',
      phone: phone || undefined,
      email: email || undefined,
      regimen: regimen
    };

    if (addTercero) {
      addTercero(newTercero);
    }
    onClientCreated(newTercero);
    toast.success(`Cliente "${name.trim()}" registrado con éxito con DV -${dvVal}.`, 'Cliente Creado');

    // Reset and close
    setName('');
    setNit('');
    setPhone('');
    setEmail('');
    setAddress('Dirección Comercial Principal');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <i className="ri-user-add-line"></i>
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-white">
                Registrar Cliente Express
              </h3>
              <p className="text-[11px] text-slate-400">
                Se creará en la base de datos y se seleccionará inmediatamente en esta factura
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg p-1 cursor-pointer"
          >
            <i className="ri-close-line"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 overflow-y-auto pr-1 flex-1 text-xs">
          {/* Name */}
          <div className="space-y-1">
            <label className="font-bold text-slate-300 block">Razón Social / Nombre:</label>
            <input
              type="text"
              required
              placeholder="ej. Inversiones Andinas S.A.S o Carlos Gómez"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-500 font-semibold"
            />
          </div>

          {/* NIT with DV */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-300 block">NIT / Cédula:</label>
              {computedDV !== null && (
                <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30 font-bold">
                  DV DIAN: -{computedDV}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="ej. 901482394"
                value={nit}
                onChange={(e) => setNit(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white font-mono font-bold focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setNit(formatNITWithDV(nit))}
                className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-xl border border-slate-700 cursor-pointer shrink-0"
                title="Aplicar formato de NIT con Dígito de Verificación"
              >
                + DV
              </button>
            </div>
          </div>

          {/* Phone and Email */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-300 block">Teléfono / WhatsApp:</label>
              <input
                type="text"
                placeholder="ej. 3101234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-300 block">Email Facturación:</label>
              <input
                type="email"
                placeholder="cliente@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Address and City */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-300 block">Ciudad:</label>
              <input
                type="text"
                placeholder="Bogotá, D.C."
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-300 block">Régimen DIAN:</label>
              <select
                value={regimen}
                onChange={(e) => setRegimen(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="no_responsable">No Responsable de IVA</option>
                <option value="responsable">Responsable de IVA</option>
                <option value="simple">Régimen Simple (RST)</option>
              </select>
            </div>
          </div>

          {/* Address full */}
          <div className="space-y-1">
            <label className="font-bold text-slate-300 block">Dirección:</label>
            <input
              type="text"
              placeholder="ej. Carrera 7 # 71 - 21 Of. 501"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <i className="ri-check-line"></i> Guardar y Seleccionar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
