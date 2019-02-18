import {
  EnumDeclarationStructure,
  InterfaceDeclarationStructure,
  PropertySignatureStructure,
  StatementedNodeStructure,
  FunctionDeclarationStructure,
  TypeAliasDeclarationStructure,
  CodeBlockWriter
} from 'ts-morph'
import {
  EnumDesc,
  StructDesc,
  Scalar,
  Type,
  EntryT,
  EntryType,
  TupleDesc,
  TypeTag,
  Variant,
  UnionDesc,
  VariantT
} from './types'

export const makeFileStructure = (entries: EntryT[]) =>
  entries.reduce<StatementedNodeStructure>(
    (file, entry) =>
      EntryType.match(entry, {
        Struct: (desc): StatementedNodeStructure => ({
          ...file,
          interfaces: (file.interfaces || []).concat(structToInterface(desc))
        }),
        Enum: desc => ({
          ...file,
          enums: (file.enums || []).concat(enumToEnum(desc))
        }),
        Union: desc => ({
          ...file,
          enums: (file.enums || []).concat(unionToTagEnum(desc)),
          typeAliases: (file.typeAliases || []).concat(
            unionToTaggedUnion(desc)
          ),
          interfaces: (file.interfaces || []).concat(
            unionToPayloadInterfaces(desc)
          )
        }),
        Tuple: desc => ({
          ...file,
          interfaces: (file.interfaces || []).concat(tupleToInterface(desc)),
          functions: (file.functions || []).concat(tupleToContsructor(desc))
        })
      }),
    {}
  )

const enumToEnum = ({
  name,
  variants
}: EnumDesc): EnumDeclarationStructure => ({
  name,
  isExported: true,
  members: variants.map(v => ({ name: v }))
})

const unionToTagEnum = ({
  name,
  variants
}: UnionDesc): EnumDeclarationStructure => ({
  name: name + 'Tag',
  isExported: true,
  members: variants.map(variantName).map(name => ({ name }))
})

const unionToTaggedUnion = ({
  name,
  variants
}: UnionDesc): TypeAliasDeclarationStructure => ({
  name,
  isExported: true,
  type: (writer: CodeBlockWriter): void => {
    variants.reduce((w, variant) => {
      const valueStr = variantPayload(name, variant)
      return w.writeLine(
        `| { tag: ${name}Tag.${variantName(variant)}${
          valueStr ? `, value: ${valueStr}` : ''
        }}`
      )
    }, writer.newLine())
  }
})

const unionToPayloadInterfaces = ({
  name: unionName,
  variants
}: UnionDesc): InterfaceDeclarationStructure[] =>
  variants
    .filter(Variant.is.Struct)
    .map(v => v.value)
    .map(({ name, members }) => ({ name: unionName + name, members }))
    .map(structToInterface)

const variantPayload = (unionName: string, v: VariantT): string | undefined =>
  Variant.match(v, {
    Struct: ({ name }) => `${unionName + name}`,
    Unit: () => undefined,
    NewType: ({ type }) => typeToString(type),
    Tuple: ({ fields }) => `[${fields.map(typeToString).join(', ')}]`
  })

const structToInterface = ({
  name,
  members
}: StructDesc): InterfaceDeclarationStructure => ({
  name,
  isExported: true,
  properties: members.map(
    ({ name, type }): PropertySignatureStructure => ({
      name,
      type: typeToString(type)
    })
  )
})

const tupleToInterface = ({
  name,
  fields
}: TupleDesc): InterfaceDeclarationStructure => ({
  name,
  isExported: true,
  properties: fields
    .map(
      (field, i): PropertySignatureStructure => ({
        name: i.toString(),
        type: typeToString(field)
      })
    )
    .concat({ name: 'length', type: fields.length.toString() })
})

const tupleToContsructor = ({
  name,
  fields
}: TupleDesc): FunctionDeclarationStructure => ({
  name: 'mk' + name,
  isExported: true,
  parameters: fields.map((f, i) => ({
    name: 'p' + i.toString(),
    type: typeToString(f)
  })),
  bodyText: `return [${fields.map((_, i) => 'p' + i.toString()).join(', ')}]`,
  returnType: name
})

const scalarToString = (scalar: Scalar): string => {
  switch (scalar) {
    case Scalar.Bool:
      return 'boolean'
    case Scalar.F32:
      return 'number'
    case Scalar.U32:
      return 'number'
    case Scalar.Str:
      return 'string'
  }
}

const typeToString = (type: Type): string => {
  switch (type.tag) {
    case TypeTag.Option:
      return `(${typeToString(type.value)}) | undefined`
    case TypeTag.Scalar:
      return scalarToString(type.value)
    case TypeTag.Vec:
      return `Array<${typeToString(type.value)}>`
    case TypeTag.RefTo:
      return type.value
  }
}

const variantName = Variant.match({
  Struct: ({ name }) => name,
  Unit: s => s,
  Tuple: ({ name }) => name,
  NewType: ({ name }) => name
})