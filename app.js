const { useState, useEffect, useMemo } = React;

// ---------- Palette ----------
const C = {
  ink: "#232A25",
  parchment: "#EFE9DA",
  cream: "#FAF7EE",
  moss: "#54704F",
  mossDeep: "#3E5439",
  rust: "#A65C39",
  stone: "#8C8370",
  hairline: "#DCD4BF",
  hairlineDark: "#C9BFA5",
};

const GENRE_PALETTE = ["#54704F", "#A65C39", "#6C5B3A", "#3E5F73", "#7A4A5A", "#5B5B7A"];
function genreColor(genre) {
  if (!genre) return C.stone;
  let hash = 0;
  for (let i = 0; i < genre.length; i++) hash = genre.charCodeAt(i) + ((hash << 5) - hash);
  return GENRE_PALETTE[Math.abs(hash) % GENRE_PALETTE.length];
}

const STATUS_META = {
  want: { label: "Want to read", color: C.stone },
  reading: { label: "Reading", color: C.rust },
  finished: { label: "Finished", color: C.moss },
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function cleanIsbn(isbn) {
  return (isbn || "").replace(/[^0-9Xx]/g, "").toUpperCase();
}

// Convert between ISBN-10 and ISBN-13 so a lookup can try both formats,
// since a given edition is sometimes only indexed under one of them.
function isbn10to13(isbn10) {
  if (isbn10.length !== 10) return null;
  const digits = isbn10.slice(0, 9).split("").map(Number);
  const withPrefix = [9, 7, 8, ...digits];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += withPrefix[i] * (i % 2 === 0 ? 1 : 3);
  const check = (10 - (sum % 10)) % 10;
  return withPrefix.join("") + check;
}
function isbn13to10(isbn13) {
  if (isbn13.length !== 13 || !isbn13.startsWith("978")) return null;
  const digits = isbn13.slice(3, 12).split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += digits[i] * (10 - i);
  const check = (11 - (sum % 11)) % 11;
  return digits.join("") + (check === 10 ? "X" : String(check));
}
function isbnVariants(isbn) {
  const c = cleanIsbn(isbn);
  if (!c) return [];
  if (c.length === 10) {
    const alt = isbn10to13(c);
    return alt ? [c, alt] : [c];
  }
  if (c.length === 13) {
    const alt = isbn13to10(c);
    return alt ? [c, alt] : [c];
  }
  return [c];
}

function coverFromIsbn(isbn) {
  const [primary] = isbnVariants(isbn);
  return primary ? `https://covers.openlibrary.org/b/isbn/${primary}-M.jpg` : null;
}

async function fetchIsbnData(isbn) {
  try {
    const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`);
    if (!res.ok) return null;
    const data = await res.json();
    return data[`ISBN:${isbn}`] || null;
  } catch (e) {
    return null;
  }
}

async function lookupIsbn(isbn) {
  for (const v of isbnVariants(isbn)) {
    const entry = await fetchIsbnData(v);
    if (entry) {
      return { title: entry.title || "", author: (entry.authors || []).map((a) => a.name).join(", ") };
    }
  }
  return null;
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ---------- Firestore storage ----------
async function loadList(uidStr, key) {
  try {
    const doc = await db.collection("users").doc(uidStr).collection("books").doc(key).get();
    return doc.exists ? doc.data().items || [] : [];
  } catch (e) {
    console.error("Load failed", e);
    return [];
  }
}
async function saveList(uidStr, key, list) {
  try {
    await db.collection("users").doc(uidStr).collection("books").doc(key).set({ items: list });
  } catch (e) {
    console.error("Save failed", e);
  }
}

// ---------- Tiny inline icon set (no external icon library needed) ----------
function Icon({ path, size = 16, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {path}
    </svg>
  );
}
const IconSearch = (p) => <Icon {...p} path={<><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>} />;
const IconPlus = (p) => <Icon {...p} path={<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>} />;
const IconX = (p) => <Icon {...p} path={<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>} />;
const IconPencil = (p) => <Icon {...p} path={<><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></>} />;
const IconTrash = (p) => <Icon {...p} path={<><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>} />;
const IconLibrary = (p) => <Icon {...p} path={<><path d="M4 21V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v16" /><path d="M14 21V7l4-2v16" /><line x1="2" y1="21" x2="22" y2="21" /></>} />;
const IconBookmark = (p) => <Icon {...p} path={<path d="M19 21l-7-5-7 5V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1z" />} />;
const IconLoader = (p) => <Icon {...p} path={<><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /><line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" /></>} />;
const IconBookOpen = (p) => <Icon {...p} path={<><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></>} />;
const IconLogOut = (p) => <Icon {...p} path={<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>} />;

// ---------- UI atoms ----------
function Pill({ children, color }) {
  return (
    <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-sm"
      style={{ color, border: `1px solid ${color}55`, background: `${color}14` }}>
      {children}
    </span>
  );
}
function Cover({ title, coverUrl, isbn }) {
  const sources = React.useMemo(() => {
    const list = [];
    if (coverUrl) list.push(coverUrl);
    isbnVariants(isbn).forEach((v) => list.push(`https://covers.openlibrary.org/b/isbn/${v}-M.jpg`));
    return list;
  }, [coverUrl, isbn]);
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [coverUrl, isbn]);

  const src = sources[index];
  if (!src) {
    return (
      <div className="flex items-center justify-center shrink-0 text-sm"
        style={{ width: "44px", height: "60px", background: C.mossDeep, color: C.parchment, fontFamily: "'Source Serif 4', Georgia, serif" }}>
        {(title || "?").trim().charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <img src={src} alt="" onError={() => setIndex((i) => i + 1)} className="shrink-0 object-cover"
      style={{ width: "44px", height: "60px", background: C.hairline }} />
  );
}
function IconButton({ onClick, title, children }) {
  return (
    <button onClick={onClick} title={title} className="p-1.5 rounded-sm transition-colors" style={{ color: C.stone }}
      onMouseEnter={(e) => (e.currentTarget.style.color = C.ink)}
      onMouseLeave={(e) => (e.currentTarget.style.color = C.stone)}>
      {children}
    </button>
  );
}
function EmptyState({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-6">
      <Icon size={28} style={{ color: C.hairlineDark }} />
      <p className="mt-3 text-sm max-w-xs" style={{ color: C.stone }}>{text}</p>
    </div>
  );
}

// ---------- Login ----------
function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (err) {
      setError("Couldn't sign in — check your email and password.");
    }
    setBusy(false);
  }

  return (
    <div className="flex h-full min-h-[600px] w-full items-center justify-center" style={{ background: C.parchment }}>
      <form onSubmit={handleSubmit} className="w-full max-w-xs p-6" style={{ background: C.cream, border: `1px solid ${C.hairlineDark}` }}>
        <h1 style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: C.ink }} className="text-xl mb-1">Shelfmark</h1>
        <p className="text-xs mb-5" style={{ color: C.stone }}>Sign in to your library</p>
        <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 text-sm mb-3 bg-transparent outline-none" style={{ border: `1px solid ${C.hairlineDark}`, color: C.ink }} />
        <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 text-sm mb-3 bg-transparent outline-none" style={{ border: `1px solid ${C.hairlineDark}`, color: C.ink }} />
        {error && <p className="text-xs mb-3" style={{ color: C.rust }}>{error}</p>}
        <button type="submit" disabled={busy} className="w-full py-2 text-sm disabled:opacity-50" style={{ background: C.ink, color: C.parchment }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

// ---------- Book / Wishlist Form ----------
function BookForm({ kind, initial, onCancel, onSave }) {
  const [isbn, setIsbn] = useState(initial?.isbn || "");
  const [title, setTitle] = useState(initial?.title || "");
  const [author, setAuthor] = useState(initial?.author || "");
  const [genre, setGenre] = useState(initial?.genre || "");
  const [status, setStatus] = useState(initial?.status || "want");
  const [priceFound, setPriceFound] = useState(initial?.priceFound ?? "");
  const [priceDate, setPriceDate] = useState(initial?.priceDate || todayStr());
  const [notes, setNotes] = useState(initial?.notes || "");
  const [looking, setLooking] = useState(false);
  const [lookupNote, setLookupNote] = useState("");

  async function handleLookup() {
    if (!cleanIsbn(isbn)) return;
    setLooking(true);
    setLookupNote("");
    const result = await lookupIsbn(isbn);
    setLooking(false);
    if (result) {
      if (result.title) setTitle(result.title);
      if (result.author) setAuthor(result.author);
      setLookupNote("Filled in from Open Library.");
    } else {
      setLookupNote("Couldn't find that ISBN — enter details manually.");
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    const base = {
      id: initial?.id || uid(),
      title: title.trim(),
      author: author.trim(),
      genre: genre.trim(),
      isbn: cleanIsbn(isbn),
      cover: coverFromIsbn(isbn),
      dateAdded: initial?.dateAdded || todayStr(),
    };
    if (kind === "collection") {
      onSave({ ...base, status, priceFound: initial?.priceFound ?? null, pricePaid: initial?.pricePaid ?? null });
    } else {
      onSave({ ...base, priceFound: priceFound === "" ? null : Number(priceFound), priceDate, notes: notes.trim() });
    }
  }

  const label = "block text-xs mb-1";
  const input = "w-full px-3 py-2 text-sm bg-transparent outline-none";
  const inputStyle = { border: `1px solid ${C.hairlineDark}`, color: C.ink, background: C.cream };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "rgba(35,42,37,0.45)" }} onClick={onCancel}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit} className="w-full max-w-md p-6" style={{ background: C.parchment, border: `1px solid ${C.hairlineDark}` }}>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: C.ink }} className="text-lg">
            {initial ? "Edit" : "Add"} {kind === "collection" ? "book" : "wishlist item"}
          </h2>
          <button type="button" onClick={onCancel} style={{ color: C.stone }}><IconX size={18} /></button>
        </div>

        <div className="mb-3">
          <label className={label} style={{ color: C.stone }}>ISBN <span style={{ color: C.stone }}>(optional — for cover art &amp; autofill)</span></label>
          <div className="flex gap-2">
            <input className={input} style={inputStyle} value={isbn} onChange={(e) => setIsbn(e.target.value)} placeholder="e.g. 9780143127550" />
            <button type="button" onClick={handleLookup} disabled={looking || !cleanIsbn(isbn)} className="px-3 text-sm shrink-0 disabled:opacity-40" style={{ background: C.moss, color: C.cream }}>
              {looking ? <IconLoader size={14} className="animate-spin" /> : "Look up"}
            </button>
          </div>
          {lookupNote && <p className="text-xs mt-1" style={{ color: C.stone }}>{lookupNote}</p>}
        </div>

        <div className="mb-3">
          <label className={label} style={{ color: C.stone }}>Title *</label>
          <input required className={input} style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className={label} style={{ color: C.stone }}>Author</label>
            <input className={input} style={inputStyle} value={author} onChange={(e) => setAuthor(e.target.value)} />
          </div>
          <div>
            <label className={label} style={{ color: C.stone }}>Genre</label>
            <input className={input} style={inputStyle} value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="e.g. Sci-fi" />
          </div>
        </div>

        {kind === "collection" ? (
          <div className="mb-4">
            <label className={label} style={{ color: C.stone }}>Status</label>
            <select className={input} style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="want">Want to read</option>
              <option value="reading">Reading</option>
              <option value="finished">Finished</option>
            </select>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={label} style={{ color: C.stone }}>Price found</label>
                <input type="number" step="0.01" min="0" className={input} style={inputStyle} value={priceFound} onChange={(e) => setPriceFound(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className={label} style={{ color: C.stone }}>Date found</label>
                <input type="date" className={input} style={inputStyle} value={priceDate} onChange={(e) => setPriceDate(e.target.value)} />
              </div>
            </div>
            <div className="mb-4">
              <label className={label} style={{ color: C.stone }}>Notes</label>
              <input className={input} style={inputStyle} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Where you saw it, edition, etc." />
            </div>
          </>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm" style={{ color: C.stone }}>Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm" style={{ background: C.ink, color: C.parchment }}>Save</button>
        </div>
      </form>
    </div>
  );
}

// ---------- Buy modal ----------
function BuyModal({ item, onCancel, onConfirm }) {
  const [price, setPrice] = useState(item.priceFound != null ? String(item.priceFound) : "");
  const diff = item.priceFound != null && price !== "" ? Number(price) - item.priceFound : null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "rgba(35,42,37,0.45)" }} onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm p-6" style={{ background: C.parchment, border: `1px solid ${C.hairlineDark}` }}>
        <h2 style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: C.ink }} className="text-lg mb-1">Mark as bought</h2>
        <p className="text-sm mb-4" style={{ color: C.stone }}>{item.title}</p>
        {item.priceFound != null && (
          <p className="text-xs mb-3" style={{ color: C.stone }}>You found this for ${item.priceFound.toFixed(2)} on {item.priceDate}.</p>
        )}
        <label className="block text-xs mb-1" style={{ color: C.stone }}>What did you pay?</label>
        <input type="number" step="0.01" min="0" autoFocus className="w-full px-3 py-2 text-sm mb-2 bg-transparent outline-none"
          style={{ border: `1px solid ${C.hairlineDark}`, color: C.ink, background: C.cream }} value={price} onChange={(e) => setPrice(e.target.value)} />
        {diff != null && !Number.isNaN(diff) && (
          <p className="text-xs mb-4" style={{ color: diff <= 0 ? C.moss : C.rust }}>
            {diff === 0 ? "Same as the price you found." : diff < 0 ? `$${Math.abs(diff).toFixed(2)} less than you expected.` : `$${diff.toFixed(2)} more than you expected.`}
          </p>
        )}
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm" style={{ color: C.stone }}>Cancel</button>
          <button onClick={() => onConfirm(price === "" ? null : Number(price))} className="px-4 py-2 text-sm" style={{ background: C.moss, color: C.cream }}>Add to collection</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Rows ----------
function CollectionRow({ book, onEdit, onDelete, onStatusChange }) {
  const meta = STATUS_META[book.status] || STATUS_META.want;
  return (
    <div className="flex items-center gap-4 px-3 py-3" style={{ borderBottom: `1px solid ${C.hairline}` }}>
      <Cover title={book.title} coverUrl={book.cover} isbn={book.isbn} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px]" style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: C.ink }}>{book.title}</p>
        <p className="truncate text-xs" style={{ color: C.stone }}>{book.author || "Unknown author"}</p>
        {book.pricePaid != null && (
          <p className="text-[11px] mt-0.5" style={{ color: C.stone }}>
            Paid ${Number(book.pricePaid).toFixed(2)}{book.priceFound != null ? ` · found at $${Number(book.priceFound).toFixed(2)}` : ""}
          </p>
        )}
      </div>
      {book.genre && <Pill color={genreColor(book.genre)}>{book.genre}</Pill>}
      <select value={book.status} onChange={(e) => onStatusChange(book.id, e.target.value)} className="text-xs px-2 py-1 bg-transparent outline-none shrink-0" style={{ border: `1px solid ${meta.color}55`, color: meta.color }}>
        <option value="want">Want to read</option>
        <option value="reading">Reading</option>
        <option value="finished">Finished</option>
      </select>
      <div className="flex shrink-0">
        <IconButton onClick={() => onEdit(book)} title="Edit"><IconPencil size={15} /></IconButton>
        <IconButton onClick={() => onDelete(book.id)} title="Remove"><IconTrash size={15} /></IconButton>
      </div>
    </div>
  );
}
function WishlistRow({ item, onEdit, onDelete, onBuy }) {
  return (
    <div className="flex items-center gap-4 px-3 py-3" style={{ borderBottom: `1px solid ${C.hairline}` }}>
      <Cover title={item.title} coverUrl={item.cover} isbn={item.isbn} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px]" style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: C.ink }}>{item.title}</p>
        <p className="truncate text-xs" style={{ color: C.stone }}>{item.author || "Unknown author"}</p>
        {item.notes && <p className="truncate text-[11px] mt-0.5" style={{ color: C.stone }}>{item.notes}</p>}
      </div>
      {item.genre && <Pill color={genreColor(item.genre)}>{item.genre}</Pill>}
      <div className="text-right shrink-0 w-24">
        {item.priceFound != null ? (
          <>
            <p className="text-sm" style={{ color: C.ink }}>${Number(item.priceFound).toFixed(2)}</p>
            <p className="text-[11px]" style={{ color: C.stone }}>{item.priceDate}</p>
          </>
        ) : <p className="text-xs" style={{ color: C.stone }}>No price yet</p>}
      </div>
      <button onClick={() => onBuy(item)} className="text-xs px-3 py-1.5 shrink-0" style={{ background: C.rust, color: C.cream }}>Bought it</button>
      <div className="flex shrink-0">
        <IconButton onClick={() => onEdit(item)} title="Edit"><IconPencil size={15} /></IconButton>
        <IconButton onClick={() => onDelete(item.id)} title="Remove"><IconTrash size={15} /></IconButton>
      </div>
    </div>
  );
}

// ---------- Main app (post-login) ----------
function Library({ user }) {
  const [tab, setTab] = useState("collection");
  const [collection, setCollection] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [buying, setBuying] = useState(null);

  useEffect(() => {
    (async () => {
      const [c, w] = await Promise.all([loadList(user.uid, "collection"), loadList(user.uid, "wishlist")]);
      setCollection(c);
      setWishlist(w);
      setLoading(false);
    })();
  }, [user.uid]);

  useEffect(() => { if (!loading) saveList(user.uid, "collection", collection); }, [collection, loading]);
  useEffect(() => { if (!loading) saveList(user.uid, "wishlist", wishlist); }, [wishlist, loading]);

  const filteredCollection = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return collection;
    return collection.filter((b) => b.title.toLowerCase().includes(q) || (b.author || "").toLowerCase().includes(q));
  }, [collection, query]);

  function openAdd() { setEditing(null); setFormOpen(true); }
  function openEdit(item) { setEditing(item); setFormOpen(true); }
  function handleSave(item) {
    if (tab === "collection") setCollection((prev) => editing ? prev.map((b) => (b.id === item.id ? item : b)) : [item, ...prev]);
    else setWishlist((prev) => editing ? prev.map((b) => (b.id === item.id ? item : b)) : [item, ...prev]);
    setFormOpen(false); setEditing(null);
  }
  function handleDelete(id) {
    if (tab === "collection") setCollection((prev) => prev.filter((b) => b.id !== id));
    else setWishlist((prev) => prev.filter((b) => b.id !== id));
  }
  function handleStatusChange(id, status) {
    setCollection((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
  }
  function confirmBuy(pricePaid) {
    const item = buying;
    setWishlist((prev) => prev.filter((b) => b.id !== item.id));
    setCollection((prev) => [{ id: uid(), title: item.title, author: item.author, genre: item.genre, isbn: item.isbn, cover: item.cover, status: "want", dateAdded: todayStr(), priceFound: item.priceFound, pricePaid }, ...prev]);
    setBuying(null);
  }

  const navBtn = (key, label, IconComp, count) => (
    <button onClick={() => setTab(key)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left"
      style={{ color: tab === key ? C.parchment : `${C.parchment}99`, background: tab === key ? `${C.parchment}1a` : "transparent" }}>
      <IconComp size={16} /><span className="flex-1">{label}</span><span style={{ color: `${C.parchment}77` }}>{count}</span>
    </button>
  );

  return (
    <div className="flex h-full min-h-[600px] w-full" style={{ background: C.parchment }}>
      <div className="w-52 shrink-0 flex flex-col py-6 px-3" style={{ background: C.ink }}>
        <div className="px-2 mb-8">
          <h1 style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: C.parchment, letterSpacing: "0.01em" }} className="text-xl">Shelfmark</h1>
          <p className="text-[11px] mt-1" style={{ color: `${C.parchment}77` }}>your library, catalogued</p>
        </div>
        <div className="flex flex-col gap-1">
          {navBtn("collection", "Collection", IconLibrary, collection.length)}
          {navBtn("wishlist", "Wishlist", IconBookmark, wishlist.length)}
        </div>
        <div className="mt-auto px-2">
          <p className="text-[11px] truncate mb-2" style={{ color: `${C.parchment}77` }}>{user.email}</p>
          <button onClick={() => auth.signOut()} className="flex items-center gap-1.5 text-xs" style={{ color: `${C.parchment}99` }}>
            <IconLogOut size={13} /> Sign out
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: `1px solid ${C.hairline}` }}>
          {tab === "collection" ? (
            <div className="flex-1 flex items-center gap-2 px-3 py-2" style={{ background: C.cream, border: `1px solid ${C.hairlineDark}` }}>
              <IconSearch size={15} style={{ color: C.stone }} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title or author" className="flex-1 bg-transparent outline-none text-sm" style={{ color: C.ink }} />
            </div>
          ) : (
            <div className="flex-1"><p className="text-sm" style={{ color: C.stone }}>Books you're keeping an eye on, with the price you found.</p></div>
          )}
          <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 text-sm shrink-0" style={{ background: C.moss, color: C.cream }}>
            <IconPlus size={15} />{tab === "collection" ? "Add book" : "Add to wishlist"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40" style={{ color: C.stone }}><IconLoader className="animate-spin" size={20} /></div>
          ) : tab === "collection" ? (
            filteredCollection.length === 0 ? (
              <EmptyState icon={IconBookOpen} text={collection.length === 0 ? "Your shelves are empty. Add the first book you own." : "No books match that search."} />
            ) : filteredCollection.map((b) => <CollectionRow key={b.id} book={b} onEdit={openEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} />)
          ) : wishlist.length === 0 ? (
            <EmptyState icon={IconBookmark} text="Nothing on your list yet — add a book you're eyeing." />
          ) : wishlist.map((w) => <WishlistRow key={w.id} item={w} onEdit={openEdit} onDelete={handleDelete} onBuy={setBuying} />)}
        </div>
      </div>

      {formOpen && <BookForm kind={tab} initial={editing} onCancel={() => { setFormOpen(false); setEditing(null); }} onSave={handleSave} />}
      {buying && <BuyModal item={buying} onCancel={() => setBuying(null)} onConfirm={confirmBuy} />}
    </div>
  );
}

// ---------- Root: auth gate ----------
function App() {
  const [user, setUser] = useState(undefined); // undefined = checking, null = signed out

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return unsub;
  }, []);

  if (user === undefined) {
    return (
      <div className="flex h-full min-h-[600px] w-full items-center justify-center" style={{ background: C.parchment, color: C.stone }}>
        <IconLoader className="animate-spin" size={20} />
      </div>
    );
  }
  return user ? <Library user={user} /> : <Login />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
