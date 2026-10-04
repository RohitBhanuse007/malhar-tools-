import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useLanguage } from '../../context/LanguageContext';

interface CustomerFormProps {
  onSubmit: (data: {
    name: string;
    contactNumber: string;
    address?: string;
    initialDues?: number;
    notes?: string;
  }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [initialDues, setInitialDues] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = t('customers.validation.nameRequired');
    if (!contactNumber.trim()) errs.contactNumber = t('customers.validation.contactRequired');

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    await onSubmit({
      name: name.trim(),
      contactNumber: contactNumber.trim(),
      address: address.trim(),
      initialDues: Number(initialDues) || 0,
      notes: notes.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label={t('customers.name')}
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
        }}
        placeholder="e.g. Anand Shinde / आनंद शिंदे"
        error={errors.name}
        required
      />

      <Input
        label={t('customers.contact')}
        value={contactNumber}
        onChange={(e) => {
          setContactNumber(e.target.value);
          if (errors.contactNumber) setErrors((prev) => ({ ...prev, contactNumber: '' }));
        }}
        placeholder="+91 98..."
        error={errors.contactNumber}
        required
      />

      <Input
        label={t('customers.address')}
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="e.g. MIDC Area, Shop No. 12"
      />

      <Input
        label="Initial Balance / Existing Dues (₹) (Optional)"
        type="number"
        step="any"
        min="0"
        value={initialDues}
        onChange={(e) => setInitialDues(e.target.value)}
        placeholder="0.00"
        leftAddon="₹"
        helperText="Enter any previous balance already owed by this customer"
      />

      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
          {t('common.notes')} ({t('common.optional')})
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Business type, workshop name, or guarantor details..."
          className="w-full rounded-lg border border-slate-300 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 placeholder:text-slate-400"
        />
      </div>

      <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
        <Button variant="outline" type="button" onClick={onCancel} disabled={isLoading}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" type="submit" isLoading={isLoading}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
};
