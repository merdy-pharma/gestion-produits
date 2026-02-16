import { useEffect, useState } from "react";
import { supabase } from '../lib/supabase';
import { Pencil, Trash2, PlusCircle, X } from "lucide-react";

interface Category {
  id: number;
  name: string;
}

export default function ExpenseCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("expense_categories")
      .select("*")
      .order("name", { ascending: true });

    if (!error && data) setCategories(data);
    setLoading(false);
  };

  const openCreate = () => {
    setEditId(null);
    setName("");
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditId(cat.id);
    setName(cat.name);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (editId) {
      await supabase.from("expense_categories").update({ name }).eq("id", editId);
    } else {
      await supabase.from("expense_categories").insert([{ name }]);
    }
    setShowModal(false);
    fetchCategories();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cette catégorie ?")) return;
    await supabase.from("expense_categories").delete().eq("id", id);
    fetchCategories();
  };

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300">Catégories de dépenses</h2>

        <button
          onClick={openCreate}
          className="btn-secondary flex items-center gap-2 px-2 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
        >
          <PlusCircle size={18} /> Ajouter
        </button>
      </div>

      <div className="page overflow-x-auto shadow rounded-lg border border-gray-200">
        <table className="table-contenair min-w-full">
          <thead className="table-head">
            <tr className="table-row">
              <th className="py-3 px-4 text-left">Désignation</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr className="table-head"><td colSpan={2} className="py-6 text-center">Chargement...</td></tr>
            ) : categories.length === 0 ? (
              <tr className="table-row"><td colSpan={2} className="py-6 text-center">Aucune catégorie</td></tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{cat.name}</td>
                  <td className="py-3 px-4 flex items-center justify-center gap-4">
                    <button onClick={() => openEdit(cat)} className="text-blue-600 hover:text-blue-800">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => handleDelete(cat.id)} className="text-red-600 hover:text-red-800">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal max-w-lg w-full">
            <button className="absolute top-3 right-3 text-gray-500 hover:text-gray-700" onClick={() => setShowModal(false)}>
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold mb-4 ">{editId ? "Modifier la catégorie" : "Ajouter une catégorie"}</h3>

            <input
              className="input"
              placeholder="Nom de la catégorie"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <button
              onClick={handleSave}
              className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
            >
              Enregistrer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
