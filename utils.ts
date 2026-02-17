
/**
 * Gera um Salt aleatório para cada novo usuário/senha.
 */
export const generateSalt = (): string => {
  return crypto.randomUUID();
};

/**
 * Gera um hash SHA-256 para uma string combinada com um Salt.
 */
export const hashPassword = async (password: string, salt: string): Promise<string> => {
  if (!password) return '';
  const encoder = new TextEncoder();
  // Combinamos a senha com o salt para garantir hashes únicos mesmo para senhas iguais
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};
