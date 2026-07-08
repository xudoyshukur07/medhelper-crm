const admin = require('firebase-admin');

// Service account faylini yuklash
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateProducts() {
  try {
    console.log('🚀 Products yangilanmoqda...');

    // 1. Barcha products ni olish
    const snapshot = await db.collection('products').get();
    console.log('📦 Jami products:', snapshot.size);

    if (snapshot.size === 0) {
      console.log('⚠️ Hech qanday product topilmadi! Yangi product qo\'shiladi.');
      
      // Default products
      const defaultProducts = [
        {
          name: 'Амарецинк 30 мл',
          tarkibi: 'Рух Бисглицинат',
          doza: '1 мл да 62,5 мг',
          miqdori: '30 мл',
          qabul: 'кунига 1-2 махал оч коринга',
          izoh: 'микро элемент',
          qollanishi: '0–3 ёш: 5 томчи\n4–13 ёш: 10 томчи\n13+: 20 томчи',
          barcode: '8018799000646',
          price: 155000,
          packaging: 'Флакон',
          groupId: 'vitaminlar',
          groupName: 'Вита',
          isActive: true,
          createdAt: new Date()
        },
        {
          name: 'Амаредетрим 15 мл',
          tarkibi: 'D3 + K2',
          doza: 'Кўрсатилмаган',
          miqdori: '15 мл',
          qabul: 'кунига 1 махал',
          izoh: 'Сүйек учун',
          qollanishi: '4 ҳафталик: 1 томчи\nЭрта туғилган: 2-3 томчи\nБолалар: 1-2 томчи',
          barcode: '8683411849783',
          price: 124000,
          packaging: 'флакон',
          groupId: 'vitaminlar',
          groupName: 'Вита',
          isActive: true,
          createdAt: new Date()
        },
        {
          name: 'Долмасто 50 мл',
          tarkibi: 'Экстракт кораси белой ивы – 8 мг, Экстракт листьев шалфея – 15 мг, Экстракт плодов витекса священного – 50 мг',
          doza: 'овқат билан',
          miqdori: '50 мл',
          qabul: '2-3 махал',
          izoh: 'гормонал баланс',
          qollanishi: '20–30 тамчи',
          barcode: '8683411843149',
          price: 180000,
          packaging: 'флакон',
          groupId: 'gormonal',
          groupName: 'Гормонал',
          isActive: true,
          createdAt: new Date()
        }
      ];

      for (const product of defaultProducts) {
        const docRef = await db.collection('products').add(product);
        console.log(✅ Product qo'shildi:  (ID: ));
      }
      console.log('✅ Barcha default products qo\'shildi!');
      return;
    }

    // 2. Mavjud products ni yangilash
    let updatedCount = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      console.log(📋 Product: );

      const updateData = {
        // Agar maydonlar mavjud bo'lmasa, qo'shish
        miqdori: data.miqdori || data.packaging || 'Кўрсатилмаган',
        qabul: data.qabul || data.usage || 'Кўрсатилмаган',
        izoh: data.izoh || data.description || '-',
        qollanishi: data.qollanishi || 'Қўлланиши кўрсатилмаган',
        tarkibi: data.tarkibi || data.composition || '-',
        doza: data.doza || data.dosage || '-',
        updatedAt: new Date()
      };

      await db.collection('products').doc(doc.id).update(updateData);
      updatedCount++;
      console.log(✅  yangilandi!);
    }

    console.log(✅  ta product yangilandi!);

  } catch (error) {
    console.error('❌ Xatolik:', error);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

updateProducts();
