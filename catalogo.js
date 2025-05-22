import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://qdxkswpdqwaumdedfcap.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkeGtzd3BkcXdhdW1kZWRmY2FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4NDE4MzgsImV4cCI6MjA2MzQxNzgzOH0.Gzy2IYXyNiNAsXRaYV65bXLLrGSBnVBH6XRLpLhVxAE"
);

// DOM
const adminForm = document.getElementById('admin-form');
const loginForm = document.getElementById('login-form');
const actionsHeader = document.getElementById('actions-header');

const productForm = document.getElementById('product-form');
const productIdInput = document.getElementById('product-id');
const imageInput = document.getElementById('product-image');
const nameInput = document.getElementById('product-name');
const descriptionInput = document.getElementById('product-description');
const priceInput = document.getElementById('product-price');
const destacadoInput = document.getElementById('product-destacado');
const productsBody = document.getElementById('products-body');

// Evitar render duplicado
let hasRendered = false;

// Sesión
const { data: initialSession } = await supabase.auth.getSession();
handleAuthUI(initialSession?.session?.user);

supabase.auth.onAuthStateChange((event, session) => {
  handleAuthUI(session?.user);
});

function handleAuthUI(user) {
  const isAdmin = user && user.email === 'admin@ferreteria.com';
  adminForm.style.display = isAdmin ? 'block' : 'none';
  loginForm.style.display = isAdmin ? 'none' : 'block';
  actionsHeader.style.display = isAdmin ? 'table-cell' : 'none';
  if (!hasRendered) {
    renderProducts(isAdmin);
    hasRendered = true;
  }
}

// Login
window.login = async function (e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    alert("Datos incorrectos");
    console.error(error);
  }
};

// Logout
window.logout = async function () {
  await supabase.auth.signOut();
};

// Renderizar productos
async function renderProducts(isAdmin) {
  productsBody.innerHTML = '';

  const { data: productos, error } = await supabase.from('productos').select('*');
  if (error) {
    console.error('Error al obtener productos:', error);
    return;
  }

  const vistos = new Set();

  productos.forEach(p => {
    if (!p.id || vistos.has(p.id)) return;
    vistos.add(p.id);

    const destacadoText = p.destacado ? 'Sí' : 'No';
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><img src="${p.image_url}" class="product-img" alt="${p.name}" /></td>
      <td>${p.name}</td>
      <td>${p.description}</td>
      <td>$${parseFloat(p.price).toFixed(2)}</td>
      ${isAdmin ? `
      <td>
        <button class="btn btn-warning btn-sm" onclick="editProduct('${p.id}')">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">Eliminar</button>
        <br><small>Destacado: ${destacadoText}</small>
      </td>` : ''}
    `;
    productsBody.appendChild(row);
  });
}

// Guardar producto
productForm.addEventListener('submit', async function (e) {
  e.preventDefault();

  const id = productIdInput.value;
  const name = nameInput.value;
  const description = descriptionInput.value;
  const price = parseFloat(priceInput.value);
  const destacado = destacadoInput.checked;
  const imageFile = imageInput.files[0];

  let image_url = "";

  if (imageFile) {
    const safeFileName = `${Date.now()}_${imageFile.name.replace(/\s/g, "_")}`;
    const { error: uploadError } = await supabase
      .storage
      .from('imagenes')
      .upload(safeFileName, imageFile, { upsert: true });

    if (uploadError) {
      alert("Error al subir imagen");
      console.error(uploadError);
      return;
    }

    image_url = `https://qdxkswpdqwaumdedfcap.supabase.co/storage/v1/object/public/imagenes/${safeFileName}`;
  } else if (id) {
    const { data: existing } = await supabase.from('productos').select('image_url').eq('id', id).single();
    image_url = existing?.image_url || "";
  }

  const data = {
    name,
    description,
    price,
    destacado,
    image_url
  };

  if (id) {
    await supabase.from('productos').update(data).eq('id', id);
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from('productos')
      .insert([data])
      .select()
      .single();

    if (insertError) {
      console.error('Error insertando producto:', insertError);
      return;
    }
  }

  this.reset();
  destacadoInput.checked = false;
  productIdInput.value = '';
  hasRendered = false; // forzar recarga limpia
  renderProducts(true);
});

// Editar producto
window.editProduct = async function (id) {
  const { data: p } = await supabase.from('productos').select('*').eq('id', id).single();
  if (!p) return;
  productIdInput.value = p.id;
  imageInput.value = '';
  nameInput.value = p.name;
  descriptionInput.value = p.description;
  priceInput.value = p.price;
  destacadoInput.checked = p.destacado || false;
  document.getElementById('save-btn').textContent = 'Actualizar';
};

// Eliminar producto
window.deleteProduct = async function (id) {
  if (confirm('¿Eliminar este producto?')) {
    await supabase.from('productos').delete().eq('id', id);
    hasRendered = false;
    renderProducts(true);
  }
};
