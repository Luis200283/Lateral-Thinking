import { Field, TextInput } from "./ui";

/**
 * Campos del editor de posts. Solo presentación: el estado y el guardado
 * viven en cada pantalla (`/posts/nuevo` y `/posts/[id]`), así comparten
 * exactamente el mismo tratamiento visual.
 */

export type PostFormValues = {
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  tags: string;
};

export function PostFields({
  values,
  onChange,
}: {
  values: PostFormValues;
  onChange: (patch: Partial<PostFormValues>) => void;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Título" className="sm:col-span-2">
        <TextInput
          value={values.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Cómo pienso los problemas difíciles"
        />
      </Field>

      <Field
        label="Slug (opcional, auto desde el título)"
        hint="URL pública: /blog/&lt;slug&gt;. Si lo dejas vacío se genera del título."
      >
        <TextInput
          value={values.slug}
          onChange={(e) => onChange({ slug: e.target.value })}
          placeholder="como-pienso-los-problemas"
        />
      </Field>

      <Field
        label="Cover image URL (opcional)"
        hint="URL pública de la portada; se usa en la home y en Open Graph."
      >
        <TextInput
          value={values.coverImage}
          onChange={(e) => onChange({ coverImage: e.target.value })}
          placeholder="https://…/portada.jpg"
        />
      </Field>

      <Field
        label="Extracto (opcional, máx. 500)"
        hint="Resumen para listados y meta descripción."
        className="sm:col-span-2"
      >
        <TextInput
          value={values.excerpt}
          onChange={(e) => onChange({ excerpt: e.target.value })}
          placeholder="Una o dos frases que enganchen."
        />
      </Field>

      <Field
        label="Tags (separados por comas)"
        hint="Se crean al guardar si no existen."
      >
        <TextInput
          value={values.tags}
          onChange={(e) => onChange({ tags: e.target.value })}
          placeholder="JS, dev"
        />
      </Field>
    </div>
  );
}
