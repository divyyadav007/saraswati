"use client";

import { useEffect, useState } from "react";
import {
  adminOrderApi,
  adminPaymentApi,
  deliveryPartnerApi,
  DeliveryPartnerModel,
  OrderModel,
} from "@/lib/api-client";

const STATUS_FILTERS = [
  "ALL",
  "PENDING_PAYMENT",
  "PLACED",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
];

const NEXT_STATUS_MAP: Record<string, string[]> = {
  PENDING_PAYMENT: ["CANCELLED"],
  PLACED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY_FOR_PICKUP", "CANCELLED"],
  READY_FOR_PICKUP: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
  REFUNDED: [],
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected Order for Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<OrderModel | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [refunding, setRefunding] = useState(false);

  // Delivery Partner Assignment State
  const [partners, setPartners] = useState<DeliveryPartnerModel[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [assigningPartner, setAssigningPartner] = useState(false);

  const getAdminToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("auth_token") || "mock-admin-token";
    }
    return "mock-admin-token";
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAdminToken();
      const res = await adminOrderApi.listOrders(
        {
          status: statusFilter === "ALL" ? undefined : statusFilter,
          q: searchQuery.trim() || undefined,
          page_size: 50,
        },
        token
      );
      setOrders(res.items);
    } catch (err: any) {
      setError(err?.message || "Failed to load orders");
      // Fallback demo orders for dev mode
      setOrders([
        {
          id: "ord-1",
          order_number: "SB-20260927-1042",
          user_id: "usr-1",
          status: "PLACED",
          payment_method: "COD",
          payment_status: "COD_PENDING",
          subtotal: 580,
          discount_amount: 0,
          delivery_charge: 0,
          tax_amount: 0,
          total_amount: 580,
          address_snapshot: {
            recipient_name: "Ramesh Kumar",
            phone: "+91 94150 12345",
            line1: "Civil Lines, Near Clock Tower",
            city: "Barabanki",
            state: "Uttar Pradesh",
            pincode: "225001",
          },
          delivery_slot: {
            id: "s1",
            slot_date: "2026-09-27",
            start_time: "10:00 AM",
            end_time: "01:00 PM",
            label: "Morning (10:00 AM – 1:00 PM)",
          },
          special_instructions: "Ring bell twice",
          packaging_notes: "Festive golden ribbon pack",
          placed_at: new Date().toISOString(),
          confirmed_at: null,
          preparing_at: null,
          ready_at: null,
          out_for_delivery_at: null,
          delivered_at: null,
          cancelled_at: null,
          cancel_reason: null,
          items: [
            {
              id: "item-1",
              item_type: "PRODUCT",
              product_variant_id: "v1",
              product_name_snapshot: "Desi Ghee Motichoor Laddu",
              variant_label_snapshot: "1kg",
              unit_price: 580,
              quantity: 1,
              line_total: 580,
            },
          ],
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadPartners = async () => {
    try {
      const token = getAdminToken();
      const data = await deliveryPartnerApi.list(true, token);
      setPartners(data);
    } catch {
      // Fallback demo partners if offline
      setPartners([
        {
          id: "dp-1",
          name: "Raju Verma",
          phone: "+91 94150 99887",
          vehicle_type: "Scooter",
          vehicle_number: "UP 41 AB 4321",
          is_active: true,
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "dp-2",
          name: "Amit Tiwari",
          phone: "+91 98390 11223",
          vehicle_type: "Motorcycle",
          vehicle_number: "UP 41 XY 9081",
          is_active: true,
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
    }
  };

  useEffect(() => {
    loadOrders();
    loadPartners();
  }, [statusFilter]);

  const handleAssignDelivery = async () => {
    if (!selectedOrder || !selectedPartnerId) return;
    try {
      setAssigningPartner(true);
      const token = getAdminToken();
      const assignment = await adminOrderApi.assignDelivery(
        selectedOrder.id,
        { delivery_partner_id: selectedPartnerId },
        token
      );
      setSelectedOrder((prev) =>
        prev ? { ...prev, delivery_assignment: assignment } : null
      );
      await loadOrders();
      alert("Delivery partner assigned successfully!");
    } catch (err: any) {
      alert(`Failed to assign delivery partner: ${err?.message || "Error"}`);
    } finally {
      setAssigningPartner(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    try {
      setUpdatingStatus(true);
      const token = getAdminToken();
      await adminOrderApi.updateStatus(orderId, nextStatus, undefined, token);
      await loadOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: nextStatus } : null));
      }
    } catch (err: any) {
      alert(`Error updating order status: ${err?.message || "Failed"}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleRefund = async (orderId: string, totalAmount: number) => {
    const reason = window.prompt("Enter reason for refund:", "Customer requested cancellation");
    if (!reason) return;
    try {
      setRefunding(true);
      const token = getAdminToken();
      await adminPaymentApi.refund(orderId, { amount: totalAmount, reason }, token);
      alert("Refund processed successfully via Razorpay.");
      await loadOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, status: "REFUNDED", payment_status: "REFUNDED" } : null
        );
      }
    } catch (err: any) {
      alert(`Refund failed: ${err?.message || "Error processing refund"}`);
    } finally {
      setRefunding(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_PAYMENT":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "PLACED":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "CONFIRMED":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "PREPARING":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "READY_FOR_PICKUP":
        return "bg-indigo-100 text-indigo-800 border-indigo-300";
      case "OUT_FOR_DELIVERY":
        return "bg-cyan-100 text-cyan-800 border-cyan-300";
      case "DELIVERED":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "CANCELLED":
        return "bg-rose-100 text-rose-800 border-rose-300";
      case "REFUNDED":
        return "bg-stone-100 text-stone-700 border-stone-300";
      default:
        return "bg-stone-100 text-stone-800 border-stone-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-serif font-bold text-stone-900">
            Orders Management
          </h1>
          <p className="text-sm text-stone-500">
            Track kitchen preparation, delivery status, and payments
          </p>
        </div>
        <button
          onClick={loadOrders}
          className="px-4 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold"
        >
          ↻ Refresh Orders
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === s
                  ? "bg-[#8A1538] text-white shadow-xs"
                  : "bg-white text-stone-600 hover:bg-stone-50 border border-stone-200"
              }`}
            >
              {s === "ALL" ? "All Orders" : s.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadOrders();
          }}
          className="flex gap-2"
        >
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order number or customer phone..."
            className="flex-1 px-4 py-2 text-sm bg-white border border-stone-300 rounded-lg outline-none focus:border-[#8A1538]"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-[#8A1538] text-white rounded-lg text-xs font-semibold"
          >
            Search
          </button>
        </form>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-400">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-stone-500">
            No orders found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Order #</th>
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">Items</th>
                  <th className="py-3.5 px-6">Total Amount</th>
                  <th className="py-3.5 px-6">Slot</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Delivery Partner</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-[#8A1538]">
                      {o.order_number}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-stone-900">
                        {o.address_snapshot?.recipient_name || "Customer"}
                      </div>
                      <div className="text-xs text-stone-500 font-mono">
                        {o.address_snapshot?.phone}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-stone-600">
                      <span className="font-semibold text-stone-800">
                        {o.items?.length || 1} item(s)
                      </span>
                    </td>
                    <td className="py-4 px-6 font-bold text-stone-900">
                      ₹{o.total_amount}{" "}
                      <span className="text-[10px] font-normal text-stone-500 block uppercase">
                        {o.payment_method}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-stone-600">
                      {o.delivery_slot?.label || "Standard"}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadge(
                          o.status
                        )}`}
                      >
                        {o.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs">
                      {o.delivery_assignment?.partner_name ? (
                        <div className="font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
                          <span>🛵</span>
                          <span>{o.delivery_assignment.partner_name}</span>
                        </div>
                      ) : (
                        <span className="text-stone-400 font-normal">Unassigned</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => setSelectedOrder(o)}
                        className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md text-xs font-semibold"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <h3 className="font-serif font-bold text-lg text-stone-900">
                  Order #{selectedOrder.order_number}
                </h3>
                <span
                  className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(
                    selectedOrder.status
                  )}`}
                >
                  Status: {selectedOrder.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-stone-400 hover:text-stone-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Quick Status Advance Actions */}
            {NEXT_STATUS_MAP[selectedOrder.status]?.length > 0 && (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <div className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Update Order Status
                </div>
                <div className="flex flex-wrap gap-2">
                  {NEXT_STATUS_MAP[selectedOrder.status].map((ns) => (
                    <button
                      key={ns}
                      disabled={updatingStatus}
                      onClick={() => handleUpdateStatus(selectedOrder.id, ns)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors disabled:opacity-50 ${
                        ns === "CANCELLED"
                          ? "bg-rose-600 hover:bg-rose-700"
                          : "bg-[#8A1538] hover:bg-rose-900"
                      }`}
                    >
                      Advance to: {ns.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Delivery & Customer Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                <div className="font-bold text-stone-700 uppercase">Customer & Address</div>
                <div className="font-semibold text-stone-900">
                  {selectedOrder.address_snapshot?.recipient_name}
                </div>
                <div>{selectedOrder.address_snapshot?.line1}</div>
                <div>
                  {selectedOrder.address_snapshot?.city} — {selectedOrder.address_snapshot?.pincode}
                </div>
                <div className="font-mono text-stone-800">
                  Phone: {selectedOrder.address_snapshot?.phone}
                </div>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                <div className="font-bold text-stone-700 uppercase">Delivery Window</div>
                <div className="font-semibold text-stone-900">
                  {selectedOrder.delivery_slot?.label || "Standard Local Delivery"}
                </div>
                <div className="text-stone-500">
                  Date: {selectedOrder.delivery_slot?.slot_date || "Today"}
                </div>
                {selectedOrder.special_instructions && (
                  <div className="pt-1 text-stone-700">
                    <strong>Instructions:</strong> {selectedOrder.special_instructions}
                  </div>
                )}
                {selectedOrder.packaging_notes && (
                  <div className="text-stone-700">
                    <strong>Packaging:</strong> {selectedOrder.packaging_notes}
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Rider & Assignment Section */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Delivery Partner & Logistics
                </div>
                {selectedOrder.delivery_assignment?.partner_name ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Assigned: {selectedOrder.delivery_assignment.partner_name}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-stone-200 text-stone-600">
                    Unassigned
                  </span>
                )}
              </div>

              {selectedOrder.delivery_assignment?.partner_name && (
                <div className="text-xs space-y-1 bg-white p-3 rounded-lg border border-stone-200">
                  <div className="font-semibold text-stone-900">
                    {selectedOrder.delivery_assignment.partner_name}
                    {selectedOrder.delivery_assignment.partner_phone && (
                      <span className="font-mono text-stone-600 ml-2">
                        ({selectedOrder.delivery_assignment.partner_phone})
                      </span>
                    )}
                  </div>
                  {selectedOrder.delivery_assignment.partner_vehicle_number && (
                    <div className="text-stone-500">
                      Vehicle: {selectedOrder.delivery_assignment.partner_vehicle_number}
                    </div>
                  )}
                  <div className="text-stone-400 text-[11px]">
                    Assigned: {new Date(selectedOrder.delivery_assignment.assigned_at).toLocaleString("en-IN")}
                  </div>
                  {selectedOrder.delivery_assignment.delivered_at && (
                    <div className="text-emerald-700 font-semibold text-[11px]">
                      Delivered: {new Date(selectedOrder.delivery_assignment.delivered_at).toLocaleString("en-IN")}
                    </div>
                  )}
                </div>
              )}

              {["CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"].includes(
                selectedOrder.status
              ) && (
                <div className="pt-2 border-t border-stone-200 space-y-2">
                  <div className="text-xs font-semibold text-stone-700">
                    {selectedOrder.delivery_assignment ? "Reassign Delivery Partner:" : "Assign Delivery Partner:"}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={selectedPartnerId}
                      onChange={(e) => setSelectedPartnerId(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-stone-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#8A1538]"
                    >
                      <option value="">-- Choose Active Rider --</option>
                      {partners.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.vehicle_type || "Vehicle"} - {p.phone})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!selectedPartnerId || assigningPartner}
                      onClick={handleAssignDelivery}
                      className="px-4 py-1.5 rounded-lg bg-[#8A1538] hover:bg-[#70102D] text-white text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      {assigningPartner ? "Assigning..." : "Assign Partner"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-stone-700 uppercase">Ordered Mithai Items</div>
              <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden text-xs">
                {selectedOrder.items?.map((i) => (
                  <div key={i.id} className="p-3 flex justify-between items-center bg-white">
                    <div>
                      <span className="font-bold text-stone-900">
                        {i.product_name_snapshot}
                      </span>
                      <span className="text-stone-500 block">
                        Size: {i.variant_label_snapshot} × {i.quantity}
                      </span>
                    </div>
                    <span className="font-bold text-stone-900">₹{i.line_total}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bill breakdown */}
            <div className="pt-2 border-t border-stone-200 flex justify-between items-baseline text-sm">
              <span className="text-stone-600">Total Bill Payable ({selectedOrder.payment_method})</span>
              <span className="font-serif font-bold text-xl text-[#8A1538]">
                ₹{selectedOrder.total_amount}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2">
              {selectedOrder.payment_method === "ONLINE" &&
              selectedOrder.payment_status === "CAPTURED" &&
              selectedOrder.status !== "REFUNDED" ? (
                <button
                  type="button"
                  disabled={refunding}
                  onClick={() => handleRefund(selectedOrder.id, selectedOrder.total_amount)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
                >
                  {refunding ? "Processing..." : "Issue Online Refund (Razorpay)"}
                </button>
              ) : <div />}

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 border rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
