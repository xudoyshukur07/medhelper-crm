import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import * as XLSX from "xlsx";
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  onSnapshot,
  serverTimestamp,
  where,
  orderBy,
  writeBatch
} from "firebase/firestore";

interface Plan {
  id: string;
  regionId: string;
  regionName: string;
  zoneId: string;
  zoneName: string;
  groupId: string;
  groupName: string;
  productId: string;
  productName: string;
  planCount: number;
  factCount: number;
  month: string;
  status: "active" | "completed" | "cancelled";
  userId: string;
  createdAt: any;
  updatedAt?: any;
}

interface Region {
  id: string;
  name: string;
  groupId: string;
  groupName: string;
  zoneIds: string[];
  zoneNames: string[];
  isActive: boolean;
}

interface Zone {
  id: string;
  name: string;
  groupId: string;
  groupName: string;
  isActive: boolean;
}

interface Product {
  id: string;
  name: string;
  groupId: string;
  groupName?: string;
  price: number;
  isActive: boolean;
}

interface Group {
  id: string;
  name: string;
  isActive: boolean;
}

interface SalesData {
  productId: string;
  productName: string;
  totalSold: number;
  month: string;
  zoneId: string;
  regionId?: string;
}

interface ProductPlan {
  productId: string;
  productName: string;
  planCount: number;
}

const Plans: React.FC = () => {
  const { user } = useAuth();
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedZone, setSelectedZone] = useState<string>("all");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  
  const [isRegionEditMode, setIsRegionEditMode] = useState(false);
  const [editingRegionId, setEditingRegionId] = useState<string | null>(null);
  const [regionProductPlans, setRegionProductPlans] = useState<Record<string, ProductPlan[]>>({});
  
  const [formData, setFormData] = useState({
    regionId: "",
    regionName: "",
    zoneId: "",
    zoneName: "",
    groupId: "",
    groupName: "",
    month: new Date().toISOString().slice(0, 7),
    status: "active" as "active" | "completed" | "cancelled"
  });

  const [productPlans, setProductPlans] = useState<ProductPlan[]>([]);
  const [availableZones, setAvailableZones] = useState<Zone[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const canManage = user?.role === "superadmin" || user?.role === "seo" || user?.role === "pm" || user?.role === "mp";

  // ============ LOAD PLANS ============
  useEffect(() => {
    const q = query(collection(db, "plans"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Plan));
      setPlans(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // ============ LOAD REGIONS ============
  useEffect(() => {
    const q = query(collection(db, "regions"), where("isActive", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRegions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Region)));
    });
    return unsubscribe;
  }, []);

  // ============ LOAD ZONES ============
  useEffect(() => {
    const q = query(collection(db, "zones"), where("isActive", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setZones(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Zone)));
    });
    return unsubscribe;
  }, []);

  // ============ LOAD PRODUCTS ============
  useEffect(() => {
    const q = query(collection(db, "products"), where("isActive", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product));
      setProducts(data);
    });
    return unsubscribe;
  }, []);

  // ============ LOAD GROUPS ============
  useEffect(() => {
    const q = query(collection(db, "productGroups"), where("isActive", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group)));
    });
    return unsubscribe;
  }, []);

  // ============ LOAD SALES DATA BY ZONE ============
  useEffect(() => {
    const loadSalesData = async () => {
      try {
        const allSales: { 
          productId: string; 
          quantity: number; 
          month: string;
          zoneId: string;
          regionId?: string;
        }[] = [];
        
        // 1. DoctorSales dan ma'lumotlar (zoneId bo'yicha)
        const doctorSalesSnapshot = await getDocs(collection(db, "doctorSales"));
        doctorSalesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.products && data.month && data.zoneId) {
            data.products.forEach((p: any) => {
              allSales.push({
                productId: p.productId,
                quantity: p.quantity || 0,
                month: data.month,
                zoneId: data.zoneId,
                regionId: data.regionId
              });
            });
          }
        });

        // 2. PharmacySales dan ma'lumotlar (zoneId bo'yicha)
        const pharmacySalesSnapshot = await getDocs(collection(db, "pharmacySales"));
        pharmacySalesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.products && data.month && data.zoneId) {
            data.products.forEach((p: any) => {
              allSales.push({
                productId: p.productId,
                quantity: p.quantity || 0,
                month: data.month,
                zoneId: data.zoneId,
                regionId: data.regionId
              });
            });
          }
        });

        // 3. ZoneSales dan ma'lumotlar (zoneId bo'yicha)
        const zoneSalesSnapshot = await getDocs(collection(db, "zoneSales"));
        zoneSalesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.products && data.month && data.zoneId) {
            data.products.forEach((p: any) => {
              allSales.push({
                productId: p.productId,
                quantity: p.quantity || 0,
                month: data.month,
                zoneId: data.zoneId,
                regionId: data.regionId
              });
            });
          }
        });

        // 4. DoctorPlanFact dan ma'lumotlar (zoneId bo'yicha)
        const doctorPlanFactSnapshot = await getDocs(collection(db, "doctorPlanFact"));
        doctorPlanFactSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.products && data.month && data.zoneId) {
            data.products.forEach((p: any) => {
              allSales.push({
                productId: p.productId,
                quantity: p.quantity || 0,
                month: data.month,
                zoneId: data.zoneId,
                regionId: data.regionId
              });
            });
          }
        });

        // Zona bo'yicha guruhlash
        const grouped: Record<string, SalesData> = {};
        
        allSales.forEach(sale => {
          const key = sale.productId + "_" + sale.month + "_" + sale.zoneId;
          const product = products.find(p => p.id === sale.productId);
          if (!grouped[key]) {
            grouped[key] = {
              productId: sale.productId,
              productName: product?.name || "Noma\'lum",
              totalSold: 0,
              month: sale.month,
              zoneId: sale.zoneId,
              regionId: sale.regionId
            };
          }
          grouped[key].totalSold += sale.quantity;
        });

        setSalesData(Object.values(grouped));
      } catch (error) {
        console.error("Sales ma\'lumotlarini yuklashda xatolik:", error);
      }
    };

    loadSalesData();
  }, [products]);

  // ============ REGION/ZONE/PRODUCT FILTERS ============
  useEffect(() => {
    if (formData.regionId) {
      const region = regions.find(r => r.id === formData.regionId);
      if (region) {
        const filteredZones = zones.filter(z => region.zoneIds.includes(z.id));
        setAvailableZones(filteredZones);
        if (region.groupId) {
          const group = groups.find(g => g.id === region.groupId);
          setFormData(prev => ({
            ...prev,
            groupId: region.groupId || "",
            groupName: group?.name || ""
          }));
        }
      }
    } else {
      setAvailableZones([]);
    }
  }, [formData.regionId, regions, zones, groups]);

  useEffect(() => {
    if (formData.zoneId) {
      const zone = zones.find(z => z.id === formData.zoneId);
      if (zone && zone.groupId) {
        const filteredProducts = products.filter(p => p.groupId === zone.groupId);
        setAvailableProducts(filteredProducts);
        
        const newProductPlans = filteredProducts.map(p => ({
          productId: p.id,
          productName: p.name,
          planCount: 0
        }));
        setProductPlans(newProductPlans);
        
        setFormData(prev => ({
          ...prev,
          groupId: zone.groupId || "",
          groupName: zone.groupName || ""
        }));
      } else {
        setAvailableProducts([]);
        setProductPlans([]);
      }
    } else {
      setAvailableProducts([]);
      setProductPlans([]);
    }
  }, [formData.zoneId, zones, products]);

  // ============ GET FACT COUNT BY ZONE ============
  const getFactCountByZone = (productId: string, month: string, zoneId: string): number => {
    const sale = salesData.find(s => 
      s.productId === productId && 
      s.month === month && 
      s.zoneId === zoneId
    );
    return sale?.totalSold || 0;
  };

  // ============ GET FACT COUNT BY REGION ============
  const getFactCountByRegion = (productId: string, month: string, regionId: string): number => {
    // Regionga tegishli zonalardagi sotuvlarni yig'ish
    const region = regions.find(r => r.id === regionId);
    if (!region) return 0;
    
    let total = 0;
    region.zoneIds.forEach(zoneId => {
      const sale = salesData.find(s => 
        s.productId === productId && 
        s.month === month && 
        s.zoneId === zoneId
      );
      if (sale) total += sale.totalSold;
    });
    return total;
  };

  // ============ FILTERED PLANS ============
  const getFilteredPlans = () => {
    let filtered = plans;
    
    if (selectedRegion !== "all") {
      filtered = filtered.filter(p => p.regionId === selectedRegion);
    }
    if (selectedZone !== "all") {
      filtered = filtered.filter(p => p.zoneId === selectedZone);
    }
    if (selectedGroup !== "all") {
      filtered = filtered.filter(p => p.groupId === selectedGroup);
    }
    if (selectedMonth) {
      filtered = filtered.filter(p => p.month === selectedMonth);
    }
    
    return filtered;
  };

  const filteredPlans = getFilteredPlans();

  // ============ GROUP BY REGION WITH ZONES ============
  const getGroupedPlans = () => {
    const grouped: Record<string, { 
      region: Region; 
      totalPlan: number; 
      totalFact: number;
      zones: Record<string, { 
        zone: Zone; 
        totalPlan: number; 
        totalFact: number;
        products: Record<string, { 
          product: Product; 
          plan: Plan | null;
          planCount: number;
          factCount: number;
          planId: string | null;
        }>;
      }>;
    }> = {};
    
    // Barcha regionlarni qo'shish
    regions.forEach(region => {
      if (!grouped[region.id]) {
        grouped[region.id] = {
          region: region,
          totalPlan: 0,
          totalFact: 0,
          zones: {}
        };
      }
    });
    
    // Planlarni qo'shish
    filteredPlans.forEach(plan => {
      const region = regions.find(r => r.id === plan.regionId);
      if (!region) return;
      
      if (!grouped[plan.regionId]) {
        grouped[plan.regionId] = {
          region: region,
          totalPlan: 0,
          totalFact: 0,
          zones: {}
        };
      }
      
      grouped[plan.regionId].totalPlan += plan.planCount;
      grouped[plan.regionId].totalFact += plan.factCount;
      
      if (plan.zoneId) {
        const zone = zones.find(z => z.id === plan.zoneId);
        if (zone) {
          if (!grouped[plan.regionId].zones[plan.zoneId]) {
            grouped[plan.regionId].zones[plan.zoneId] = {
              zone: zone,
              totalPlan: 0,
              totalFact: 0,
              products: {}
            };
          }
          
          const zoneGroup = grouped[plan.regionId].zones[plan.zoneId];
          zoneGroup.totalPlan += plan.planCount;
          zoneGroup.totalFact += plan.factCount;
          
          if (plan.productId) {
            const product = products.find(p => p.id === plan.productId);
            if (product) {
              if (!zoneGroup.products[plan.productId]) {
                zoneGroup.products[plan.productId] = {
                  product: product,
                  plan: null,
                  planCount: 0,
                  factCount: 0,
                  planId: null
                };
              }
              // Eng so'nggi plan ma'lumotlarini saqlash
              zoneGroup.products[plan.productId].plan = plan;
              zoneGroup.products[plan.productId].planCount = plan.planCount;
              zoneGroup.products[plan.productId].factCount = plan.factCount;
              zoneGroup.products[plan.productId].planId = plan.id;
            }
          }
        }
      }
    });
    
    // Planlari bo'lmagan zonalar va mahsulotlarni ham qo'shish
    Object.keys(grouped).forEach(regionId => {
      const region = regions.find(r => r.id === regionId);
      if (region) {
        region.zoneIds.forEach(zoneId => {
          const zone = zones.find(z => z.id === zoneId);
          if (zone && !grouped[regionId].zones[zoneId]) {
            grouped[regionId].zones[zoneId] = {
              zone: zone,
              totalPlan: 0,
              totalFact: 0,
              products: {}
            };
            
            // Zonaga tegishli mahsulotlarni qo'shish
            const zoneProducts = products.filter(p => p.groupId === zone.groupId);
            zoneProducts.forEach(product => {
              grouped[regionId].zones[zoneId].products[product.id] = {
                product: product,
                plan: null,
                planCount: 0,
                factCount: getFactCountByZone(product.id, selectedMonth, zoneId),
                planId: null
              };
            });
          }
        });
      }
    });
    
    return grouped;
  };

  const groupedPlans = getGroupedPlans();

  // ============ PRODUCT PLAN HANDLERS ============
  const handleProductPlanChange = (productId: string, value: number) => {
    setProductPlans(prev => 
      prev.map(p => 
        p.productId === productId 
          ? { ...p, planCount: value }
          : p
      )
    );
  };

  // ============ REGION PLAN EDIT ============
  const handleRegionEdit = (regionId: string) => {
    setIsRegionEditMode(true);
    setEditingRegionId(regionId);
    
    const region = regions.find(r => r.id === regionId);
    if (region) {
      setFormData({
        regionId: region.id,
        regionName: region.name,
        zoneId: "",
        zoneName: "",
        groupId: region.groupId || "",
        groupName: region.groupName || "",
        month: selectedMonth,
        status: "active"
      });
      
      const regionZones = zones.filter(z => region.zoneIds.includes(z.id));
      const allProducts: ProductPlan[] = [];
      
      regionZones.forEach(zone => {
        const zoneProducts = products.filter(p => p.groupId === zone.groupId);
        zoneProducts.forEach(p => {
          if (!allProducts.find(ap => ap.productId === p.id)) {
            allProducts.push({
              productId: p.id,
              productName: p.name,
              planCount: 0
            });
          }
        });
      });
      
      setRegionProductPlans(prev => ({
        ...prev,
        [regionId]: allProducts
      }));
      
      setShowModal(true);
    }
  };

  const handleRegionProductPlanChange = (regionId: string, productId: string, value: number) => {
    setRegionProductPlans(prev => {
      const regionPlans = prev[regionId] || [];
      const updated = regionPlans.map(p => 
        p.productId === productId ? { ...p, planCount: value } : p
      );
      return { ...prev, [regionId]: updated };
    });
  };

  const handleSaveRegionPlans = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!editingRegionId) {
      setError("Регион танланмаган!");
      return;
    }

    const plansToAdd = (regionProductPlans[editingRegionId] || [])
      .filter(p => p.planCount > 0);
    
    if (plansToAdd.length === 0) {
      setError("Ҳеч бўлмаса битта препаратга план киритинг!");
      return;
    }

    try {
      const batch = writeBatch(db);
      
      // Eski planlarni o'chirish (agar mavjud bo'lsa)
      const existingPlans = plans.filter(p => 
        p.regionId === editingRegionId && 
        p.month === formData.month
      );
      
      existingPlans.forEach(p => {
        const docRef = doc(db, "plans", p.id);
        batch.delete(docRef);
      });
      
      // Yangi planlarni qo'shish
      plansToAdd.forEach(productPlan => {
        const factCount = getFactCountByRegion(
          productPlan.productId, 
          formData.month, 
          editingRegionId
        );
        const docRef = doc(collection(db, "plans"));
        
        const region = regions.find(r => r.id === editingRegionId);
        
        batch.set(docRef, {
          regionId: editingRegionId,
          regionName: region?.name || "",
          zoneId: "",
          zoneName: "",
          groupId: formData.groupId || "",
          groupName: formData.groupName || "",
          productId: productPlan.productId,
          productName: productPlan.productName,
          planCount: productPlan.planCount,
          factCount: factCount,
          month: formData.month,
          status: formData.status,
          userId: auth.currentUser?.uid || "anonymous",
          userEmail: auth.currentUser?.email || "",
          createdAt: serverTimestamp()
        });
      });

      await batch.commit();
      setSuccess(`${plansToAdd.length} та план сақланди!`);
      setShowModal(false);
      setIsRegionEditMode(false);
      setEditingRegionId(null);
      resetForm();
    } catch (err: any) {
      setError("Xatolik: " + err.message);
    }
  };

  // ============ CRUD OPERATIONS ============
  const handleAddPlans = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.regionId || !formData.zoneId || !formData.month) {
      setError("Регион, Зона ва Ой мажбурий!");
      return;
    }

    const plansToAdd = productPlans.filter(p => p.planCount > 0);
    
    if (plansToAdd.length === 0) {
      setError("Ҳеч бўлмаса битта препаратга план киритинг!");
      return;
    }

    try {
      const batch = writeBatch(db);
      
      plansToAdd.forEach(productPlan => {
        const factCount = getFactCountByZone(
          productPlan.productId, 
          formData.month, 
          formData.zoneId
        );
        const docRef = doc(collection(db, "plans"));
        
        batch.set(docRef, {
          regionId: formData.regionId,
          regionName: formData.regionName,
          zoneId: formData.zoneId,
          zoneName: formData.zoneName,
          groupId: formData.groupId,
          groupName: formData.groupName,
          productId: productPlan.productId,
          productName: productPlan.productName,
          planCount: productPlan.planCount,
          factCount: factCount,
          month: formData.month,
          status: formData.status,
          userId: auth.currentUser?.uid || "anonymous",
          userEmail: auth.currentUser?.email || "",
          createdAt: serverTimestamp()
        });
      });

      await batch.commit();
      setSuccess(`${plansToAdd.length} та план сақланди!`);
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setError("Xatolik: " + err.message);
    }
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setError("");
    setSuccess("");

    const factCount = getFactCountByZone(
      productPlans[0]?.productId || "", 
      formData.month,
      formData.zoneId
    );

    try {
      await updateDoc(doc(db, "plans", editingId), {
        ...formData,
        productId: productPlans[0]?.productId || "",
        productName: productPlans[0]?.productName || "",
        planCount: productPlans[0]?.planCount || 0,
        factCount: factCount,
        updatedAt: serverTimestamp()
      });
      setSuccess("План янгиланди!");
      setEditingId(null);
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setError("Xatolik: " + err.message);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm("Ушбу планни ўчирамизми?")) return;
    try {
      await deleteDoc(doc(db, "plans", id));
      setSuccess("План ўчирилди!");
    } catch (err: any) {
      setError("Xatolik: " + err.message);
    }
  };

  const handleEditPlan = (plan: Plan) => {
    setEditingId(plan.id);
    setFormData({
      regionId: plan.regionId,
      regionName: plan.regionName,
      zoneId: plan.zoneId || "",
      zoneName: plan.zoneName || "",
      groupId: plan.groupId || "",
      groupName: plan.groupName || "",
      month: plan.month,
      status: plan.status || "active"
    });
    
    setProductPlans([{
      productId: plan.productId,
      productName: plan.productName,
      planCount: plan.planCount
    }]);
    
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      regionId: "",
      regionName: "",
      zoneId: "",
      zoneName: "",
      groupId: "",
      groupName: "",
      month: new Date().toISOString().slice(0, 7),
      status: "active"
    });
    setProductPlans([]);
    setAvailableZones([]);
    setAvailableProducts([]);
    setEditingId(null);
    setIsRegionEditMode(false);
    setEditingRegionId(null);
    setEditingProductId(null);
  };

  // ============ STATISTICS ============
  const totalPlan = filteredPlans.reduce((sum, p) => sum + p.planCount, 0);
  const totalFact = filteredPlans.reduce((sum, p) => sum + p.factCount, 0);
  const completionRate = totalPlan > 0 ? Math.round((totalFact / totalPlan) * 100) : 0;

  // ============ EXPORT ============
  const handleExport = () => {
    const data = filteredPlans.map((p, i) => ({
      "№": i + 1,
      "Регион": p.regionName,
      "Зона": p.zoneName || "-",
      "Гуруҳ": p.groupName || "-",
      "Препарат": p.productName,
      "План": p.planCount,
      "Факт": p.factCount,
      "Бажарилиш": p.planCount > 0 ? Math.round((p.factCount / p.planCount) * 100) + "%" : "0%",
      "Ой": p.month,
      "Ҳолат": p.status === "active" ? "Фаол" : p.status === "completed" ? "Бажарилган" : "Бекор"
    }));

    if (data.length === 0) {
      setError("Экспорт қилиш учун маълумот йўқ!");
      return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Планлар");
    XLSX.writeFile(wb, "планлар_" + new Date().toISOString().split("T")[0] + ".xlsx");
    setSuccess("Экспорт қилинди!");
  };

  // ============ RENDER ============
  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center" }}>⏳ Юкланмоқда...</div>;
  }

  return (
    <div style={{ padding: "20px" }}>
      {error && <div style={{ background: "#fee", color: "#c33", padding: "10px", borderRadius: "8px", marginBottom: "15px" }}>❌ {error}</div>}
      {success && <div style={{ background: "#efe", color: "#3c3", padding: "10px", borderRadius: "8px", marginBottom: "15px" }}>✅ {success}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
        <h2 style={{ margin: 0 }}>📊 План ва Факт</h2>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: "8px" }}
          />
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: "8px" }}
          >
            <option value="all">📋 Барча регионлар</option>
            {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: "8px" }}
          >
            <option value="all">📌 Барча зоналар</option>
            {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: "8px" }}
          >
            <option value="all">📂 Барча гуруҳлар</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <button onClick={handleExport} style={{ padding: "8px 16px", background: "#3498db", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>📤 Экспорт</button>
          {canManage && (
            <>
              <button onClick={() => { resetForm(); setShowModal(true); }} style={{ padding: "8px 16px", background: "#667eea", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>
                ➕ Зонага План
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <div style={{ background: "white", padding: "16px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", borderLeft: "4px solid #667eea" }}>
          <div style={{ fontSize: "12px", color: "#666" }}>📊 Жами план</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#667eea" }}>{totalPlan}</div>
        </div>
        <div style={{ background: "white", padding: "16px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", borderLeft: "4px solid #2ecc71" }}>
          <div style={{ fontSize: "12px", color: "#666" }}>✅ Жами факт</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#2ecc71" }}>{totalFact}</div>
        </div>
        <div style={{ background: "white", padding: "16px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", borderLeft: "4px solid #f39c12" }}>
          <div style={{ fontSize: "12px", color: "#666" }}>🎯 Бажарилиш</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#f39c12" }}>{completionRate}%</div>
        </div>
        <div style={{ background: "white", padding: "16px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", borderLeft: "4px solid #e74c3c" }}>
          <div style={{ fontSize: "12px", color: "#666" }}>📋 Жами планлар</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#e74c3c" }}>{filteredPlans.length}</div>
        </div>
      </div>

      {/* Grouped by Region with Zones and Products */}
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ marginBottom: "12px" }}>📂 Регионлар бўйича таксимот</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: "12px" }}>
          {Object.keys(groupedPlans).length === 0 ? (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "30px", color: "#999" }}>📭 Ҳеч қандай план мавжуд эмас</div>
          ) : (
            Object.values(groupedPlans).map((item, index) => (
              <div key={index} style={{ background: "white", borderRadius: "12px", padding: "16px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", borderLeft: "4px solid #667eea" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ margin: "0 0 4px" }}>📍 {item.region.name}</h4>
                  {canManage && (
                    <button 
                      onClick={() => handleRegionEdit(item.region.id)} 
                      style={{ padding: "4px 12px", background: "#667eea", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}
                    >
                      ✏️ Регионга план
                    </button>
                  )}
                </div>
                <div style={{ fontSize: "12px", color: "#888" }}>📂 {item.region.groupName || "Гуруҳсиз"}</div>
                <div style={{ display: "flex", gap: "12px", marginTop: "8px", fontSize: "13px", flexWrap: "wrap" }}>
                  <span>🎯 План: {item.totalPlan.toLocaleString()}</span>
                  <span>✅ Факт: {item.totalFact.toLocaleString()}</span>
                  <span style={{ 
                    color: item.totalPlan > 0 && (item.totalFact / item.totalPlan) >= 0.8 ? "#2ecc71" : "#f39c12",
                    fontWeight: "bold"
                  }}>
                    {item.totalPlan > 0 ? Math.round((item.totalFact / item.totalPlan) * 100) : 0}%
                  </span>
                </div>
                
                {/* Zonalar bo'yicha - har bir zona alohida ko'rinadi */}
                {Object.keys(item.zones).length > 0 && (
                  <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "2px solid #e8ecf1" }}>
                    {Object.values(item.zones).map((zoneItem, zi) => (
                      <div key={zi} style={{ 
                        background: "#f8f9fa", 
                        borderRadius: "8px", 
                        padding: "12px",
                        marginTop: zi > 0 ? "10px" : 0,
                        borderLeft: "3px solid #3498db"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: "bold", fontSize: "14px" }}>📌 {zoneItem.zone.name}</span>
                          <span style={{ fontSize: "12px", color: "#666" }}>
                            План: {zoneItem.totalPlan} | Факт: {zoneItem.totalFact} | 
                            <span style={{ 
                              color: zoneItem.totalPlan > 0 && (zoneItem.totalFact / zoneItem.totalPlan) >= 0.8 ? "#2ecc71" : "#f39c12",
                              fontWeight: "bold"
                            }}>
                              {zoneItem.totalPlan > 0 ? Math.round((zoneItem.totalFact / zoneItem.totalPlan) * 100) : 0}%
                            </span>
                          </span>
                        </div>
                        
                        {/* Har bir zona uchun mahsulotlar ro'yxati */}
                        {Object.keys(zoneItem.products).length > 0 && (
                          <div style={{ marginTop: "8px", paddingLeft: "16px" }}>
                            {Object.values(zoneItem.products).map((productItem, pi) => {
                              const percentage = productItem.planCount > 0 
                                ? Math.round((productItem.factCount / productItem.planCount) * 100) 
                                : 0;
                              
                              return (
                                <div key={pi} style={{ 
                                  display: "flex", 
                                  justifyContent: "space-between", 
                                  alignItems: "center",
                                  fontSize: "12px",
                                  padding: "6px 4px",
                                  borderBottom: pi < Object.keys(zoneItem.products).length - 1 ? "1px solid #e8ecf1" : "none"
                                }}>
                                  <span style={{ fontWeight: "500" }}>💊 {productItem.product.name}</span>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span>
                                      П: {productItem.planCount} | Ф: {productItem.factCount}
                                    </span>
                                    <span style={{ 
                                      color: percentage >= 80 ? "#2ecc71" : percentage >= 50 ? "#f39c12" : "#e74c3c",
                                      fontWeight: "bold"
                                    }}>
                                      {percentage}%
                                    </span>
                                    {canManage && productItem.planId && (
                                      <>
                                        <button 
                                          onClick={() => {
                                            const plan = plans.find(p => p.id === productItem.planId);
                                            if (plan) handleEditPlan(plan);
                                          }} 
                                          style={{ 
                                            padding: "2px 6px", 
                                            background: "#cce5ff", 
                                            border: "none", 
                                            borderRadius: "4px", 
                                            cursor: "pointer",
                                            fontSize: "10px"
                                          }}
                                        >
                                          ✏️
                                        </button>
                                        <button 
                                          onClick={() => productItem.planId && handleDeletePlan(productItem.planId)} 
                                          style={{ 
                                            padding: "2px 6px", 
                                            background: "#f8d7da", 
                                            border: "none", 
                                            borderRadius: "4px", 
                                            cursor: "pointer",
                                            fontSize: "10px"
                                          }}
                                        >
                                          🗑️
                                        </button>
                                      </>
                                    )}
                                    {canManage && !productItem.planId && (
                                      <button 
                                        onClick={() => {
                                          const zone = zones.find(z => z.id === zoneItem.zone.id);
                                          if (zone) {
                                            setFormData({
                                              regionId: item.region.id,
                                              regionName: item.region.name,
                                              zoneId: zone.id,
                                              zoneName: zone.name,
                                              groupId: zone.groupId || "",
                                              groupName: zone.groupName || "",
                                              month: selectedMonth,
                                              status: "active"
                                            });
                                            setProductPlans([{
                                              productId: productItem.product.id,
                                              productName: productItem.product.name,
                                              planCount: 0
                                            }]);
                                            setShowModal(true);
                                          }
                                        }} 
                                        style={{ 
                                          padding: "2px 6px", 
                                          background: "#d4edda", 
                                          border: "none", 
                                          borderRadius: "4px", 
                                          cursor: "pointer",
                                          fontSize: "10px"
                                        }}
                                      >
                                        ➕
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: "white", padding: "30px", borderRadius: "16px", maxWidth: "700px", width: "90%", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h3>
              {isRegionEditMode 
                ? `✏️ Регионга план қўшиш: ${formData.regionName}` 
                : editingId 
                  ? "✏️ Планни таҳрирлаш" 
                  : "📊 Зонага план қўшиш"
              }
            </h3>
            
            <form onSubmit={isRegionEditMode ? handleSaveRegionPlans : (editingId ? handleUpdatePlan : handleAddPlans)}>
              {!isRegionEditMode && (
                <>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontWeight: "500", marginBottom: "4px" }}>Регион *</label>
                    <select 
                      value={formData.regionId} 
                      onChange={(e) => {
                        const region = regions.find(r => r.id === e.target.value);
                        setFormData({
                          ...formData,
                          regionId: e.target.value,
                          regionName: region?.name || "",
                          zoneId: "",
                          zoneName: "",
                          groupId: region?.groupId || "",
                          groupName: region?.groupName || ""
                        });
                        setProductPlans([]);
                      }}
                      style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "6px" }}
                    >
                      <option value="">Регион танланг</option>
                      {regions.map(r => {
                        const groupName = r.groupName ? " (" + r.groupName + ")" : "";
                        return <option key={r.id} value={r.id}>{r.name}{groupName}</option>;
                      })}
                    </select>
                  </div>

                  {formData.regionId && (
                    <div style={{ marginBottom: "12px" }}>
                      <label style={{ display: "block", fontWeight: "500", marginBottom: "4px" }}>Зона *</label>
                      <select 
                        value={formData.zoneId} 
                        onChange={(e) => {
                          const zone = zones.find(z => z.id === e.target.value);
                          setFormData({
                            ...formData,
                            zoneId: e.target.value,
                            zoneName: zone?.name || "",
                            groupId: zone?.groupId || "",
                            groupName: zone?.groupName || ""
                          });
                        }}
                        style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "6px" }}
                      >
                        <option value="">Зона танланг</option>
                        {availableZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                        {availableZones.length === 0 && (
                          <option value="">Бу регионга зона бириктирилмаган</option>
                        )}
                      </select>
                      {formData.groupName && (
                        <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                          📂 Гуруҳ: {formData.groupName}
                        </div>
                      )}
                    </div>
                  )}

                  {formData.zoneId && productPlans.length > 0 && (
                    <div style={{ marginBottom: "12px" }}>
                      <label style={{ display: "block", fontWeight: "500", marginBottom: "4px" }}>
                        Препаратлар ва планлар *
                      </label>
                      <div style={{ 
                        background: "#f8f9fa", 
                        padding: "12px", 
                        borderRadius: "8px",
                        maxHeight: "300px",
                        overflowY: "auto"
                      }}>
                        {productPlans.map((p, index) => {
                          const factCount = getFactCountByZone(p.productId, formData.month, formData.zoneId);
                          return (
                            <div 
                              key={p.productId} 
                              style={{ 
                                display: "flex", 
                                alignItems: "center", 
                                gap: "10px",
                                padding: "8px",
                                borderBottom: index < productPlans.length - 1 ? "1px solid #e8ecf1" : "none"
                              }}
                            >
                              <span style={{ flex: 1, fontWeight: "500" }}>{p.productName}</span>
                              <input
                                type="number"
                                min="0"
                                value={p.planCount}
                                onChange={(e) => handleProductPlanChange(p.productId, Number(e.target.value))}
                                style={{ 
                                  width: "120px", 
                                  padding: "6px 10px",
                                  border: "1px solid #ddd",
                                  borderRadius: "6px",
                                  fontSize: "14px"
                                }}
                                placeholder="План сони"
                              />
                              <span style={{ 
                                fontSize: "12px", 
                                color: factCount > 0 ? "#2ecc71" : "#888",
                                fontWeight: factCount > 0 ? "bold" : "normal"
                              }}>
                                Факт: {factCount}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                        ⚠️ Фақат план сони 0 дан катта бўлган препаратлар сақланади
                      </div>
                    </div>
                  )}
                </>
              )}

              {isRegionEditMode && (
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontWeight: "500", marginBottom: "4px" }}>
                    Регион бўйича препаратлар ва планлар *
                  </label>
                  <div style={{ 
                    background: "#f8f9fa", 
                    padding: "12px", 
                    borderRadius: "8px",
                    maxHeight: "300px",
                    overflowY: "auto"
                  }}>
                    {(regionProductPlans[editingRegionId || ""] || []).map((p, index) => {
                      const factCount = getFactCountByRegion(p.productId, formData.month, editingRegionId || "");
                      return (
                        <div 
                          key={p.productId} 
                          style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            gap: "10px",
                            padding: "8px",
                            borderBottom: index < (regionProductPlans[editingRegionId || ""] || []).length - 1 ? "1px solid #e8ecf1" : "none"
                          }}
                        >
                          <span style={{ flex: 1, fontWeight: "500" }}>{p.productName}</span>
                          <input
                            type="number"
                            min="0"
                            value={p.planCount}
                            onChange={(e) => handleRegionProductPlanChange(
                              editingRegionId || "", 
                              p.productId, 
                              Number(e.target.value)
                            )}
                            style={{ 
                              width: "120px", 
                              padding: "6px 10px",
                              border: "1px solid #ddd",
                              borderRadius: "6px",
                              fontSize: "14px"
                            }}
                            placeholder="План сони"
                          />
                          <span style={{ 
                            fontSize: "12px", 
                            color: factCount > 0 ? "#2ecc71" : "#888",
                            fontWeight: factCount > 0 ? "bold" : "normal"
                          }}>
                            Факт: {factCount}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                    ⚠️ Фақат план сони 0 дан катта бўлган препаратлар сақланади
                  </div>
                </div>
              )}

              {!isRegionEditMode && formData.zoneId && productPlans.length === 0 && (
                <div style={{ 
                  background: "#fff3cd", 
                  padding: "10px", 
                  borderRadius: "8px", 
                  marginBottom: "12px",
                  color: "#856404"
                }}>
                  ⚠️ Бу зонага бириктирилган препаратлар мавжуд эмас. Илтимос аввал препаратларни зонага бириктиринг.
                </div>
              )}

              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontWeight: "500", marginBottom: "4px" }}>Ой *</label>
                <input 
                  type="month" 
                  value={formData.month} 
                  onChange={(e) => setFormData({...formData, month: e.target.value})} 
                  required 
                  style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "6px" }} 
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontWeight: "500", marginBottom: "4px" }}>Ҳолат</label>
                <select 
                  value={formData.status} 
                  onChange={(e) => setFormData({...formData, status: e.target.value as "active" | "completed" | "cancelled"})} 
                  style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "6px" }}
                >
                  <option value="active">✅ Фаол</option>
                  <option value="completed">🎉 Бажарилган</option>
                  <option value="cancelled">❌ Бекор қилинган</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} style={{ padding: "8px 16px", background: "#e8ecf1", border: "none", borderRadius: "6px", cursor: "pointer" }}>Бекор</button>
                <button type="submit" style={{ padding: "8px 16px", background: "#667eea", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>
                  {isRegionEditMode 
                    ? `${(regionProductPlans[editingRegionId || ""] || []).filter(p => p.planCount > 0).length} та план сақлаш`
                    : editingId 
                      ? "Янгилаш" 
                      : `${productPlans.filter(p => p.planCount > 0).length} та план сақлаш`
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Plans;



