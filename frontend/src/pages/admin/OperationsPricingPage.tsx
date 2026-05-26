import { useEffect, useState } from "react";

import type { AdminPricingEditorItem } from "../../services/adminPricingApi";
import { loadAdminPricing, saveAdminPricing } from "../../services/adminPricingApi";

const createPricingItemCode = () => `service_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

export function OperationsPricingPage() {
  const [items, setItems] = useState<AdminPricingEditorItem[]>([]);
  const [message, setMessage] = useState("Loading pricing...");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      try {
        const pricing = await loadAdminPricing();

        if (!isMounted) {
          return;
        }

        setItems(pricing);
        setMessage("Pricing loaded from the database.");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMessage(error instanceof Error ? error.message : "Could not load pricing.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateItem = (code: string, field: keyof AdminPricingEditorItem, value: string | boolean | number) => {
    setItems((current) => current.map((item) => {
      if (item.code !== code) {
        return field === "isBookingFee" && value ? { ...item, isBookingFee: false } : item;
      }

      return {
        ...item,
        [field]: value
      };
    }));
  };

  const addService = () => {
    setItems((current) => [
      ...current,
      {
        code: createPricingItemCode(),
        name: "",
        description: "",
        priceCents: 0,
        discountType: "none",
        discountValue: 0,
        discountLabel: "",
        sortOrder: current.length + 1,
        isBookingFee: false,
        isActive: true
      }
    ]);
    setMessage("New service added. Fill in the fields and save pricing.");
  };

  const removeService = (code: string) => {
    setItems((current) => current.filter((item) => item.code !== code));
    setMessage("Service removed. Save pricing to persist the deletion.");
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage("Saving pricing...");

    try {
      const result = await saveAdminPricing(items);
      setItems(result.pricing);
      setMessage(`${result.message} The client pricing screen will pick this up from /pricing.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save pricing.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatPrice = (priceCents: number) => `$${(priceCents / 100).toFixed(2)}`;

  if (isLoading) {
    return <div className="admin-state-card">Loading pricing...</div>;
  }

  return (
    <section className="admin-page-grid">
      <div className="admin-page-hero-card">
        <div>
          <p className="admin-page-hero-card__eyebrow">Operations</p>
          <h2>Pricing</h2>
          <p>Editable service and fee controls so the old pricing area also lives inside the React admin.</p>
        </div>
        <div className="admin-pagination__actions">
          <button className="admin-button" type="button" onClick={addService}>
            Add service
          </button>
          <button className="admin-button admin-button--primary" type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save pricing"}
          </button>
        </div>
      </div>

      <p className="admin-inline-message">{message}</p>

      <div className="admin-pricing-grid">
        {items.map((item) => (
          <article key={item.code} className="admin-panel-react admin-pricing-card">
            <div className="admin-pricing-card__header">
              <div>
                <span className="admin-pricing-card__code">{item.code}</span>
                <h3>{item.name || "Untitled service"}</h3>
              </div>
              <div className="admin-pricing-card__price">
                <strong>{formatPrice(item.priceCents)}</strong>
                <span>{item.isActive ? "Public" : "Hidden"}</span>
              </div>
            </div>

            <div className="admin-pricing-form">
              <label className="admin-toolbar__field">
                <span>Name</span>
                <input value={item.name} onChange={(event) => updateItem(item.code, "name", event.target.value)} />
              </label>
              <label className="admin-toolbar__field admin-pricing-form__wide">
                <span>Description</span>
                <input value={item.description} onChange={(event) => updateItem(item.code, "description", event.target.value)} />
              </label>
              <label className="admin-toolbar__field">
                <span>Price</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={(item.priceCents / 100).toFixed(2)}
                  onChange={(event) => updateItem(item.code, "priceCents", Math.round(Number(event.target.value || 0) * 100))}
                />
              </label>
              <label className="admin-toolbar__field">
                <span>Sort order</span>
                <input type="number" min="0" value={item.sortOrder} onChange={(event) => updateItem(item.code, "sortOrder", Number(event.target.value || 0))} />
              </label>
              <label className="admin-toolbar__field">
                <span>Discount type</span>
                <select value={item.discountType} onChange={(event) => updateItem(item.code, "discountType", event.target.value as AdminPricingEditorItem["discountType"])}>
                  <option value="none">No discount</option>
                  <option value="percent">Percent off</option>
                  <option value="fixed">Fixed amount off</option>
                </select>
              </label>
              <label className="admin-toolbar__field">
                <span>Discount value</span>
                <input type="number" min="0" value={item.discountValue} onChange={(event) => updateItem(item.code, "discountValue", Number(event.target.value || 0))} />
              </label>
              <label className="admin-toolbar__field">
                <span>Discount label</span>
                <input value={item.discountLabel} placeholder="Spring special" onChange={(event) => updateItem(item.code, "discountLabel", event.target.value)} />
              </label>
            </div>

            <div className="admin-pricing-card__footer">
              <label className="admin-switch-row">
                <input type="checkbox" checked={item.isBookingFee} onChange={(event) => updateItem(item.code, "isBookingFee", event.target.checked)} />
                <span />
                <strong>Booking fee</strong>
              </label>
              <label className="admin-switch-row">
                <input type="checkbox" checked={item.isActive} onChange={(event) => updateItem(item.code, "isActive", event.target.checked)} />
                <span />
                <strong>Public</strong>
              </label>
              <button className="admin-button admin-button--danger" type="button" onClick={() => removeService(item.code)}>
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
