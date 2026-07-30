/** Datos para crear una cuenta de técnico vía la Cloud Function `createUser`
 *  (no se puede crear un usuario de Firebase Auth para otra persona desde
 *  el cliente — necesita el Admin SDK, ver CLAUDE.md §13 / `functions/`). */
export interface NewTechnicianData {
  displayName: string;
  email: string;
  password: string;
  phone?: string;
}

/** Campos editables sin pasar por Auth (nombre/teléfono) — el email y la
 *  contraseña no se editan desde este formulario simple. */
export interface TechnicianDetailsUpdate {
  displayName?: string;
  phone?: string;
}
