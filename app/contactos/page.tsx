import { readContacts } from '@/lib/contacts';
import ContactsClient from '@/components/ContactsClient';
import { getAuthUserFromCookies } from '@/lib/auth';

export default async function ContactosPage(){
  const contacts = await readContacts();
  const user = await getAuthUserFromCookies();
  const isAdmin = !!(user && user.isAdmin);
  return (
    <div>
      <div className="toolbar">
        <h2 className="m-0">Contactos</h2>
      </div>
      <ContactsClient contacts={contacts as any} isAdmin={isAdmin} />
    </div>
  );
}
