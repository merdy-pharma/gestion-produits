"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import {X } from 'lucide-react';
import { Input } from "@/components/ui/input";

type Product = {
  id: string;
  name: string;
};

type Batch = {
  id: string;
  product_id: string;
  batch_number: string | null;
  expiration_date: string;
  quantity: number;
  purchase_price: number | null;
  received_at: string;
  products?: { name: string };
};

export default function ProductBatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
 // const [selectedProduct, setSelectedProduct] = useState(null);
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const paginatedBatches = useMemo(() => {
  const start = (page - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return batches.slice(start, end);
  }, 
  [batches, page, itemsPerPage]);
  const totalPages = Math.ceil(batches.length / itemsPerPage);

  const [form, setForm] = useState({
    product_id: "",
    batch_number: "",
    expiration_date: "",
    quantity: 0,
    purchase_price: 0,
  });

  // 🔹 Charger produits
  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, name")
      .order("name");

    if (data) setProducts(data);
  };

  // 🔹 Charger lots (avec filtre optionnel)
  const fetchBatches = async () => {
    setLoading(true);

    let query = supabase
      .from("product_batches")
      .select(`*, products ( name )`)
      .order("expiration_date", { ascending: true });

    if (selectedProduct) {
      query = query.eq("product_id", selectedProduct);
    }

    const { data } = await query;

    if (data) setBatches(data);
    setPage(1);

    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [selectedProduct]);

  // 🔹 Calcul stock total par produit
  const stockTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    batches.forEach((b) => {
      totals[b.product_id] =
        (totals[b.product_id] || 0) + b.quantity;
    });
    return totals;
  }, [batches]);

  // 🔹 Gestion expiration
  const getExpirationStatus = (dateStr: string) => {
    const today = new Date();
    const exp = new Date(dateStr);
    const diffDays =
      (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays < 0) return "expired";
    if (diffDays <= 30) return "warning";
    return "valid";
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setEditingBatch(null);
    setForm({
      product_id: "",
      batch_number: "",
      expiration_date: "",
      quantity: 0,
      purchase_price: 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.product_id) return alert("Produit obligatoire");
    if (!form.expiration_date) return alert("Date obligatoire");
    if (Number(form.quantity) < 0) return alert("Quantité invalide");

    setLoading(true);

    if (editingBatch) {
      await supabase
        .from("product_batches")
        .update({
          product_id: form.product_id,
          batch_number: form.batch_number || null,
          expiration_date: form.expiration_date,
          quantity: Number(form.quantity),
          purchase_price: Number(form.purchase_price) || null,
        })
        .eq("id", editingBatch.id);
    } else {
      await supabase.from("product_batches").insert({
        product_id: form.product_id,
        batch_number: form.batch_number || null,
        expiration_date: form.expiration_date,
        quantity: Number(form.quantity),
        purchase_price: Number(form.purchase_price) || null,
      });
    }

    await fetchBatches();
    resetForm();
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce lot ?")) return;
    await supabase.from("product_batches").delete().eq("id", id);
    fetchBatches();
  };

  const handleEdit = (batch: Batch) => {
    setEditingBatch(batch);
    setForm({
      product_id: batch.product_id,
      batch_number: batch.batch_number || "",
      expiration_date: batch.expiration_date,
      quantity: batch.quantity,
      purchase_price: batch.purchase_price || 0,
    });
  };

  return (
    <div className="page p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Gestion des Lots</h1>
      <span className="fixed top-16 right-10 m-4 z-50">
        <button
                onClick={() => navigate("/products")}
                className="btn-danger rounded-full p-2 shadow"
              >
                <X size={18} />
         </button>
      </span>


      {/* 🔎 Filtre produit 1 - version dynamique */}
<div className="mb-4 flex gap-4 items-start relative">
  
  <div className="relative w-64">
    <Input
      placeholder="Rechercher un produit (min 3 lettres)"
      value={query}
      onChange={(e) => {
        const value = e.target.value;
        setQuery(value);
        setSelectedProduct(null);
        setPage(1);

        if (value.length >= 3) {
          const filtered = products.filter((p) =>
            p.name.toLowerCase().includes(value.toLowerCase())
          );
          setResults(filtered);
        } else {
          setResults([]);
        }
      }}
      //classname="w-full border border-gray-300 dark:border-gray-100 bg-white dark:bg-gray-800 px-3 py-2 rounded transition-colors"
    />

    {results.length > 0 && (
      <div className="absolute z-10 w-full border bg-white dark:bg-gray-900 max-h-40 overflow-auto rounded shadow">
        {results.map((p) => (
          <div
            key={p.id}
            className="p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => {
              setSelectedProduct(p.id);
              setQuery(p.name);
              setResults([]);
              setPage(1);
            }}
          >
            {p.name}
          </div>
        ))}
      </div>
    )}
  </div>

  {selectedProduct && (
    <div className="bg-blue-100 dark:bg-blue-700 px-4 py-2 rounded font-semibold">
      Stock total : {stockTotals[selectedProduct] || 0}
    </div>
  )}
</div>

      {/* 🔎 Filtre produit
      <div className="mb-4 flex gap-4 items-center"> 
        <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="input select border p-2 rounded" > 
          
          <option value="">Tous les produits</option> 
          
          {products.map((p) => ( <option key={p.id} value={p.id}> {p.name} </option> ))} </select> 
        {selectedProduct && ( <div className="bg-blue-100 dark:bg-gray-700 px-4 py-2 rounded font-semibold"> Stock total : {stockTotals[selectedProduct] || 0}
        </div>)} 
      </div>
      */} 
      
      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-2 gap-4 bg-white dark:bg-gray-700 p-4 rounded shadow mb-6"
      >
        
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">
            Produit <span className="text-red-500">*</span>
          </label>
          <select
            name="product_id"
            value={form.product_id}
            onChange={handleChange}
            required
            className= "w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 rounded transition-colors"
          >
            <option value="">-- Sélectionner un produit --</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              Numéro de lot
            </label>
            <input
              type="text"
              name="batch_number"
              placeholder="Numéro lot"
              value={form.batch_number}
              onChange={handleChange}
              className="border p-2 rounded w-full border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 px-3 py-2 rounded transition-colors"
            />
           </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">
            Date d'expiration <span className="text-red-500">*</span>
          </label>
          
            <input
              type="date"
              name="expiration_date"
              value={form.expiration_date}
              onChange={handleChange}
              className="border p-2 rounded"/>
         </div>

      <div className="flex flex-col">
        <label className="text-sm font-medium mb-1">
          Quantité Lot
        </label>
        <input
          type="number"
          name="quantity"
          placeholder="Quantité"
          value={form.quantity}
          onChange={handleChange}
          className="border p-2 rounded"
        />
        </div>
        
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">
          Prix d'achat unitaire
        </label>
        <input
          type="number"
          step="0.01"
          name="purchase_price"
          placeholder="Prix d'achat"
          value={form.purchase_price}
          onChange={handleChange}
          className="border p-2 rounded"
        />
        </div>
        <div className="col-span-2 flex gap-2">
          <button className="bg-blue-600 text-white px-4 py-2 rounded">
            {editingBatch ? "Mettre à jour" : "Créer"}
          </button>
        </div>
      </form>

      {/* TABLE*/}
      <div className="shadow rounded overflow-x-auto bg-white dark:bg-gray-700 rounded-lg shadow-sm p-4 transition-colors">
        <table className="w-full border-collapse">
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              <th className="p-2 border">Produit</th>
              <th className="p-2 border">Lot</th>
              <th className="p-2 border">Expiration</th>
              <th className="p-2 border">Quantité</th>
              <th className="p-2 border">Prix achat</th>
              <th className="p-2 border">Statut</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedBatches.map((batch) => {
              const status = getExpirationStatus(batch.expiration_date);

              return (
                <tr key={batch.id} className="border-b border-gray-200 dark:border-gray-700 dark:bg-gray-600">
                  <td className="p-2 border">
                    {batch.products?.name}
                  </td>
                  <td className="p-2 border">
                    {batch.batch_number || "-"}
                  </td>
                  <td className="p-2 border">
                    {batch.expiration_date}
                  </td>
                  <td className="p-2 border">
                    {batch.quantity}
                  </td>
                  <td className="p-2 border">
                    {batch.purchase_price || "-"}
                  </td>
                  <td className="p-2 border">
                    {status === "expired" && (
                      <span className="bg-red-600 text-white px-2 py-1 rounded text-sm">
                        Expiré
                      </span>
                    )}
                    {status === "warning" && (
                      <span className="bg-yellow-400 text-black px-2 py-1 rounded text-sm">
                        Expire bientôt
                      </span>
                    )}
                    {status === "valid" && (
                      <span className="bg-green-500 text-white px-2 py-1 rounded text-sm">
                        Valide
                      </span>
                    )}
                  </td>
                  <td className="p-2 border flex gap-2">
                    <button
                      onClick={() => handleEdit(batch)}
                      className="bg-yellow-500 text-white px-2 py-1 rounded"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(batch.id)}
                      className="bg-red-600 text-white px-2 py-1 rounded"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

      <div className="flex justify-between items-center p-4 dark:bg-gray-100">
        <span className="text-sm text-gray-600">
          Page {page} sur {totalPages}
        </span>
      
        <div className="flex gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1 border rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
          >
            Précédent
          </button>
      
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1 border rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
          >
            Suivant
          </button>
      </div>
    </div>
  </div>
</div>
  );
}