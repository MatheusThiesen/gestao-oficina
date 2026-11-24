export interface CatalogBrand {
  name: string
  /** Logo como data URL (null quando a marca não tem logo no catálogo). */
  logo: string | null
}

export interface CatalogModel {
  name: string
  /** "model" = modelo-base (Onix); "version" = versão da FIPE (Onix HATCH LT 1.0…). */
  kind: 'model' | 'version'
}
