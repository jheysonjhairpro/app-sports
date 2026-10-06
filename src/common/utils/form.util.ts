/** En multipart/form-data todo llega como texto; estas funciones lo convierten al tipo correcto. */
export const aBooleano = ({ value }: { value: unknown }) => {
  if (value === 'true' || value === '1' || value === true) return true;
  if (value === 'false' || value === '0' || value === false) return false;
  return value;
};

/** Acepta '["a","b"]', 'a,b' o el mismo campo repetido varias veces. */
export const aLista = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const v = value.trim();
  if (!v) return [];
  if (v.startsWith('[')) {
    try {
      return JSON.parse(v);
    } catch {
      return value;
    }
  }
  return v.split(',').map((x) => x.trim()).filter(Boolean);
};
