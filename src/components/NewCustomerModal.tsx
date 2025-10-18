"use client";

import { useState, useEffect, useRef } from "react";
import Modal from "./Modal";

interface Customer {
  id: string;
  name: string;
  phone: string;
  phoneCode?: string;
  shopeeName: string | null;
  _count?: { orders: number };
}

interface NewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewCustomerModal({ isOpen, onClose, onSuccess }: NewCustomerModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [fetchingData, setFetchingData] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    phoneCode: "+62",
    shopeeName: "",
  });

  // Search state for existing customers
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
    }
  }, [isOpen]);

  async function fetchCustomers() {
    try {
      const response = await fetch("/api/customers");
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
    } finally {
      setFetchingData(false);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  // Filter customers based on search
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    customer.phone.includes(search) ||
    (customer.shopeeName && customer.shopeeName.toLowerCase().includes(search.toLowerCase()))
  );

  // Handle customer selection
  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setSearch(`${customer.name} (${customer.phone})${customer.shopeeName ? ` - ${customer.shopeeName}` : ''}`);
    setShowDropdown(false);
    
    // Auto-fill form with selected customer data
    setFormData({
      name: customer.name || "",
      phone: customer.phone || "",
      phoneCode: customer.phoneCode || "+62",
      shopeeName: customer.shopeeName || "",
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Use selected customer or create new from form
      let customerId = selectedCustomerId;

      if (!customerId) {
        if (!formData.name.trim() || !formData.phone.trim()) {
          throw new Error("Name and phone are required");
        }

        const response = await fetch("/api/customers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            phoneCode: formData.phoneCode.trim(),
            shopeeName: formData.shopeeName.trim() || null,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create customer");
        }
      }

      // Reset form
      setFormData({
        name: "",
        phone: "",
        phoneCode: "+62",
        shopeeName: "",
      });
      
      setSearch("");
      setSelectedCustomerId("");
      
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Customer" size="xl">
      {fetchingData ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Search Existing Customer or Create New */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">Customer Details</h2>
            
            {/* Search existing customer */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Existing Customer
              </label>
              <div className="relative" ref={inputRef}>
                <input
                  type="text"
                  placeholder="Search and select customer..."
                  value={search || (selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.phone})${selectedCustomer.shopeeName ? ` - ${selectedCustomer.shopeeName}` : ''}` : '')}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    if (e.target.value === '') {
                      setSelectedCustomerId('');
                    }
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="input w-full"
                />
                {showDropdown && (
                  <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto mt-1">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((customer) => (
                        <div
                          key={customer.id}
                          onClick={() => handleCustomerSelect(customer)}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        >
                          {customer.name} ({customer.phone})
                          {customer.shopeeName && ` - ${customer.shopeeName}`}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-500">No customers found</div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Search for an existing customer or fill out the form below to create a new one
              </p>
            </div>

            {/* Customer Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input w-full"
                  placeholder="Enter customer name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Code *</label>
                <input
                  type="text"
                  name="phoneCode"
                  value={formData.phoneCode}
                  onChange={handleInputChange}
                  className="input w-full"
                  placeholder="e.g. +62"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="input w-full"
                  placeholder="Enter phone number"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Shopee Name (Optional)</label>
                <input
                  type="text"
                  name="shopeeName"
                  value={formData.shopeeName}
                  onChange={handleInputChange}
                  className="input w-full"
                  placeholder="Enter Shopee username if applicable"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Customer"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}