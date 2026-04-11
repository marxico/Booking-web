import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { fetchOrderDetail } from "../../services/adminMockService";
import type { OrderDetail } from "../../types/admin";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function OrderDetailPage() {
  const { orderId = "" } = useParams();
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadOrder = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const nextDetail = await fetchOrderDetail(orderId);

        if (isMounted) {
          setDetail(nextDetail);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Order detail failed to load.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadOrder();

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  if (isLoading) {
    return <div className="admin-state-card">Loading order detail...</div>;
  }

  if (errorMessage || !detail) {
    return (
      <div className="admin-state-card admin-state-card--error">
        <h2>Order not available</h2>
        <p>{errorMessage || "This order could not be located."}</p>
        <Link className="admin-button admin-button--primary" to="/admin/order-invoice/orders">
          Back to orders
        </Link>
      </div>
    );
  }

  return (
    <section className="admin-page-grid">
      <div className="admin-page-hero-card">
        <div>
          <p className="admin-page-hero-card__eyebrow">Order detail</p>
          <h2>{detail.id}</h2>
          <p>{detail.customer} • {detail.vehicle}</p>
        </div>
        <Link className="admin-button admin-button--primary" to="/admin/order-invoice/orders">
          Back to orders
        </Link>
      </div>

      <div className="admin-kpi-grid">
        <article className="admin-kpi-card">
          <span>Status</span>
          <strong>{detail.status}</strong>
          <small>Payment: {detail.paymentStatus}</small>
        </article>
        <article className="admin-kpi-card tone-positive">
          <span>Total</span>
          <strong>{currency.format(detail.total)}</strong>
          <small>Advisor: {detail.advisor}</small>
        </article>
        <article className="admin-kpi-card">
          <span>Opened</span>
          <strong>{detail.date}</strong>
          <small>Customer-facing summary</small>
        </article>
      </div>

      <div className="admin-detail-grid">
        <article className="admin-panel-react">
          <div className="admin-panel-react__header">
            <h3>Line items</h3>
          </div>
          <div className="admin-table-shell">
            <table className="admin-table-react">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {detail.lineItems.map((item) => (
                  <tr key={item.description}>
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>{currency.format(item.unitPrice)}</td>
                    <td>{currency.format(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="admin-panel-react">
          <div className="admin-panel-react__header">
            <h3>Timeline</h3>
          </div>
          <div className="admin-timeline">
            {detail.timeline.map((item) => (
              <div key={item.label} className="admin-timeline__item">
                <strong>{item.label}</strong>
                <span>{item.timestamp}</span>
              </div>
            ))}
          </div>
          <div className="admin-note-card">
            <h4>Notes</h4>
            <p>{detail.notes}</p>
          </div>
        </article>
      </div>
    </section>
  );
}
