// tslint:disable:no-non-null-assertion
// tslint:disable:no-string-literal
import { AttributeMap, MapAttributeValue } from 'aws-sdk/clients/dynamodb'
import {
  organization1CreatedAt,
  organization1Employee1CreatedAt,
  organization1Employee2CreatedAt,
  organization1LastUpdated,
  organizationFromDb,
} from '../../test/data/organization-dynamodb.data'
import { productFromDb } from '../../test/data/product-dynamodb.data'
import {
  Birthday,
  Employee,
  Id,
  ModelWithAutogeneratedId,
  ModelWithCustomMapperModel,
  ModelWithDateAsHashKey,
  ModelWithDateAsIndexHashKey,
  ModelWithoutCustomMapper,
  ModelWithoutCustomMapperOnIndex,
  Organization,
  OrganizationEvent,
  Product,
  Type,
} from '../../test/models'
import { PropertyMetadata } from '../decorator'
import { fromDb, fromDbOne, toDb, toDbOne } from './mapper'
import {
  Attribute,
  Attributes,
  BooleanAttribute,
  ListAttribute,
  MapAttribute,
  NullAttribute,
  NumberAttribute,
  StringAttribute,
  StringSetAttribute,
} from './type/attribute.type'
import { EnumType } from './type/enum.type'

describe('Mapper', () => {
  describe('should map single values', () => {
    describe('to db', () => {
      it('string', () => {
        const attrValue = <StringAttribute>toDbOne('foo')!
        expect(attrValue).toBeDefined()
        expect(attrValue.S).toBeDefined()
        expect(attrValue.S).toBe('foo')
      })

      it('string (empty)', () => {
        const attrValue = <StringAttribute>toDbOne('')!
        expect(attrValue).toBe(null)
      })

      it('number', () => {
        const attrValue = <NumberAttribute>toDbOne(3)!
        expect(attrValue).toBeDefined()
        expect(keyOf(attrValue)).toBe('N')
        expect(attrValue.N).toBe('3')
      })

      it('boolean', () => {
        const attrValue = <BooleanAttribute>toDbOne(false)!
        expect(attrValue).toBeDefined()
        expect(keyOf(attrValue)).toBe('BOOL')
        expect(attrValue.BOOL).toBe(false)
      })

      it('null', () => {
        const attrValue = <NullAttribute>toDbOne(null)!
        expect(attrValue).toBeDefined()
        expect(keyOf(attrValue)).toBe('NULL')
        expect(attrValue.NULL).toBe(true)
      })

      it('enum (no enum decorator)', () => {
        const attrValue = <NumberAttribute>toDbOne(Type.FirstType)!
        expect(attrValue).toBeDefined()
        expect(keyOf(attrValue)).toBe('N')
        expect(attrValue.N).toBe('0')
      })

      it('enum (propertyMetadata -> no enum decorator)', () => {
        const attrValue: Attribute = <MapAttribute>toDbOne(Type.FirstType, <any>{
          typeInfo: { type: Object, isCustom: true },
        })!
        expect(attrValue).toBeDefined()
        expect(keyOf(attrValue)).toBe('M')
        expect(attrValue.M).toEqual({})
      })

      it('enum (with decorator)', () => {
        const attrValue = <NumberAttribute>toDbOne(Type.FirstType, <any>{
          typeInfo: { type: EnumType, isCustom: true },
        })!
        expect(attrValue).toBeDefined()
        expect(keyOf(attrValue)).toBe('N')
        expect(attrValue.N).toBe('0')
      })

      it('array -> SS (homogen, no duplicates)', () => {
        const attrValue = <StringSetAttribute>toDbOne(['foo', 'bar'])!
        expect(attrValue).toBeDefined()
        expect(keyOf(attrValue)).toBe('SS')
        expect(attrValue.SS[0]).toBe('foo')
        expect(attrValue.SS[1]).toBe('bar')
      })

      it('array -> L (homogen, no duplicates, explicit type)', () => {
        const propertyMetadata = <Partial<PropertyMetadata<any>>>{
          typeInfo: { type: Array, isCustom: true },
        }
        const attrValue = <ListAttribute>toDbOne(['foo', 'bar'], <any>propertyMetadata)!
        expect(attrValue).toBeDefined()
        expect(keyOf(attrValue)).toBe('L')

        expect(keyOf(attrValue.L[0])).toBe('S')
        expect((<StringAttribute>attrValue.L[0]).S).toBe('foo')

        expect(keyOf(attrValue.L[1])).toBe('S')
        expect((<StringAttribute>attrValue.L[1]).S).toBe('bar')
      })

      it('array -> L (heterogen, no duplicates)', () => {
        const attrValue = <ListAttribute>toDbOne(['foo', 56, true])!
        expect(attrValue).toBeDefined()
        expect(keyOf(attrValue)).toBe('L')
        expect(attrValue.L).toBeDefined()
        expect(attrValue.L.length).toBe(3)

        const foo = <StringAttribute>attrValue.L[0]
        expect(foo).toBeDefined()
        expect(keyOf(foo)).toBe('S')
        expect(foo.S).toBe('foo')

        const no = <NumberAttribute>attrValue.L[1]
        expect(no).toBeDefined()
        expect(keyOf(no)).toBe('N')
        expect(no.N).toBe('56')

        const bool = <BooleanAttribute>attrValue.L[2]
        expect(bool).toBeDefined()
        expect(keyOf(bool)).toBe('BOOL')
        expect(bool.BOOL).toBe(true)
      })

      it('array -> L (homogen, complex type)', () => {
        const attrValue = <ListAttribute>(
          toDbOne([{ name: 'max', age: 25, sortedSet: null }, { name: 'anna', age: 65, sortedSet: null }])!
        )

        expect(attrValue).toBeDefined()
        expect(keyOf(attrValue)).toBe('L')

        const employee1 = <MapAttribute>attrValue.L[0]
        expect(employee1).toBeDefined()
        expect(keyOf(employee1)).toBe('M')
        expect(Object.keys(employee1.M).length).toBe(2)
        expect(employee1.M.name).toBeDefined()
        expect(keyOf(employee1.M.name)).toBe('S')
        expect((<StringAttribute>employee1.M.name).S).toBe('max')

        expect(employee1.M.age).toBeDefined()
        expect(keyOf(employee1.M.age)).toBe('N')
        expect((<NumberAttribute>employee1.M.age).N).toBe('25')
      })

      it('set', () => {
        const attrValue = <ListAttribute>toDbOne(new Set(['foo', 'bar', 25]))!
        expect(attrValue).toBeDefined()
        expect(keyOf(attrValue)).toBe('L')
        expect(attrValue.L[0]).toEqual({ S: 'foo' })
        expect(attrValue.L[1]).toEqual({ S: 'bar' })
        expect(attrValue.L[2]).toEqual({ N: '25' })
      })

      it('set (empty)', () => {
        const attrValue = <NullAttribute>toDbOne(new Set())!
        expect(attrValue).toBe(null)
      })

      it('set of objects', () => {
        const attrValue = <ListAttribute>toDbOne(new Set([{ name: 'foo', age: 56 }, { name: 'anna', age: 26 }]))!

        expect(attrValue).toBeDefined()
        expect(keyOf(attrValue)).toBe('L')
        expect(attrValue.L.length).toBe(2)
        expect((<MapAttribute>attrValue.L[0]).M).toBeDefined()
        expect((<MapAttribute>attrValue.L[0]).M.name).toBeDefined()
        expect(keyOf((<MapAttribute>attrValue.L[0]).M.name)).toBe('S')
        expect((<StringAttribute>(<MapAttribute>attrValue.L[0]).M.name).S).toBe('foo')
      })

      it('simple object', () => {
        const attrValue = <MapAttribute>toDbOne({ name: 'foo', age: 56 })!
        expect(attrValue).toBeDefined()
        expect(keyOf(attrValue)).toBe('M')

        // name
        expect(attrValue.M.name).toBeDefined()
        expect(keyOf(attrValue.M.name)).toBe('S')
        expect((<StringAttribute>attrValue.M.name).S).toBe('foo')

        // age
        expect(attrValue.M.age).toBeDefined()
        expect(keyOf(attrValue.M.age)).toBe('N')
        expect((<NumberAttribute>attrValue.M.age).N).toBe('56')
      })

      it('complex object', () => {
        const attrValue = <MapAttribute>toDbOne({
          name: 'Max',
          age: 35,
          children: [{ name: 'Anna', age: 5 }, { name: 'Hans', age: 7 }],
        })!
        expect(attrValue).toBeDefined()
        expect(keyOf(attrValue)).toBe('M')

        // name
        expect(attrValue.M.name).toBeDefined()
        expect(keyOf(attrValue.M.name)).toBe('S')
        expect((<StringAttribute>attrValue.M.name).S).toBe('Max')

        // age
        expect(attrValue.M.age).toBeDefined()
        expect(keyOf(attrValue.M.age)).toBe('N')
        expect((<NumberAttribute>attrValue.M.age).N).toBe('35')

        // children
        expect(attrValue.M.children).toBeDefined()
        expect(keyOf(attrValue.M.children)).toBe('L')
        expect((<ListAttribute>attrValue.M.children).L.length).toBe(2)
        expect(keyOf((<ListAttribute>attrValue.M.children).L[0])).toBe('M')
        expect(keyOf((<ListAttribute>attrValue.M.children).L[1])).toBe('M')

        const firstChild = <MapAttribute>(<ListAttribute>attrValue.M.children).L[0]
        // first child
        expect(firstChild.M.name).toBeDefined()
        expect(keyOf(firstChild.M.name)).toBe('S')
        expect((<StringAttribute>firstChild.M.name).S).toBe('Anna')

        expect(firstChild.M.age).toBeDefined()
        expect(keyOf(firstChild.M.age)).toBe('N')
        expect((<NumberAttribute>firstChild.M.age).N).toBe('5')

        const secondChild = <MapAttribute>(<ListAttribute>attrValue.M.children).L[1]
        // second child
        expect(secondChild.M.name).toBeDefined()
        expect(keyOf(secondChild.M.name)).toBe('S')
        expect((<StringAttribute>secondChild.M.name).S).toBe('Hans')

        expect(secondChild.M.age).toBeDefined()
        expect(keyOf(secondChild.M.age)).toBe('N')
        expect((<NumberAttribute>secondChild.M.age).N).toBe('7')
      })
    })

    describe('from db', () => {
      it('S -> String', () => {
        const attrValue = { S: 'foo' }
        expect(fromDbOne(attrValue)).toBe('foo')
      })

      it('N -> Number', () => {
        const attrValue = { N: '56' }
        expect(fromDbOne(attrValue)).toBe(56)
      })

      it('BOOL -> Boolean', () => {
        const attrValue = { BOOL: true }
        expect(fromDbOne(attrValue)).toBe(true)
      })

      it('NULL -> null', () => {
        const attrValue = { NULL: true }
        expect(fromDbOne(attrValue)).toBe(null)
      })

      it('SS -> set', () => {
        const attrValue = { SS: ['foo', 'bar'] }
        const set: Set<string> = fromDbOne(attrValue)
        // noinspection SuspiciousInstanceOfGuard
        expect(set instanceof Set).toBeTruthy()
        expect(set.size).toBe(2)
        expect(Array.from(set)[0]).toBe('foo')
        expect(Array.from(set)[1]).toBe('bar')
      })

      it('SS -> array', () => {
        const propertyMetadata = <Partial<PropertyMetadata<any>>>{
          typeInfo: { type: Array, isCustom: true },
        }
        const attrValue = { SS: ['foo', 'bar'] }
        const arr = fromDbOne<string[]>(attrValue, <any>propertyMetadata)
        expect(Array.isArray(arr)).toBeTruthy()
        expect(arr.length).toBe(2)
        expect(arr[0]).toBe('foo')
        expect(arr[1]).toBe('bar')
      })

      it('NS -> set', () => {
        const attrValue = { NS: ['45', '2'] }
        const set = fromDbOne<Set<number>>(attrValue)
        // noinspection SuspiciousInstanceOfGuard
        expect(set instanceof Set).toBeTruthy()
        expect(set.size).toBe(2)
        expect(Array.from(set)[0]).toBe(45)
        expect(Array.from(set)[1]).toBe(2)
      })

      it('NS -> array', () => {
        const propertyMetadata = <Partial<PropertyMetadata<any>>>{
          typeInfo: { type: Array, isCustom: true },
        }
        const attrValue = { NS: ['45', '2'] }
        const arr = fromDbOne<number[]>(attrValue, <any>propertyMetadata)
        expect(Array.isArray(arr)).toBeTruthy()
        expect(arr.length).toBe(2)
        expect(arr[0]).toBe(45)
        expect(arr[1]).toBe(2)
      })

      it('L -> array', () => {
        const attrValue = { L: [{ S: 'foo' }, { N: '45' }, { BOOL: true }] }
        const arr: any[] = fromDbOne<any[]>(attrValue)
        expect(Array.isArray(arr)).toBeTruthy()
        expect(arr.length).toBe(3)
        expect(arr[0]).toBe('foo')
        expect(arr[1]).toBe(45)
        expect(arr[2]).toBe(true)
      })

      it('L -> set', () => {
        const propertyMetadata = <Partial<PropertyMetadata<any>>>{
          typeInfo: { type: Set, isCustom: true },
        }
        const attrValue = { L: [{ S: 'foo' }, { N: '45' }, { BOOL: true }] }
        const set = fromDbOne<Set<any>>(attrValue, <any>propertyMetadata)
        // noinspection SuspiciousInstanceOfGuard
        expect(set instanceof Set).toBeTruthy()
        expect(set.size).toBe(3)
        expect(Array.from(set)[0]).toBe('foo')
        expect(Array.from(set)[1]).toBe(45)
        expect(Array.from(set)[2]).toBe(true)
      })

      it('M', () => {
        const attrValue = {
          M: {
            name: { S: 'name' },
            age: { N: '56' },
            active: { BOOL: true },
            siblings: { SS: ['hans', 'andi', 'dora'] },
          },
        }
        const obj = fromDbOne<any>(attrValue)

        expect(obj.name).toBe('name')
        expect(obj.age).toBe(56)
        expect(obj.active).toBe(true)
        expect(obj.siblings).toBeDefined()
        expect(obj.siblings instanceof Set).toBeTruthy()
        expect(obj.siblings.size).toBe(3)
        expect(Array.from(obj.siblings)[0]).toBe('hans')
        expect(Array.from(obj.siblings)[1]).toBe('andi')
        expect(Array.from(obj.siblings)[2]).toBe('dora')
      })
    })
  })

  describe('should map model', () => {
    describe('to db', () => {
      describe('model class created with new', () => {
        let organization: Organization
        let organizationAttrMap: Attributes<Organization>
        let createdAt: Date
        let lastUpdated: Date
        let createdAtDateEmployee1: Date
        let createdAtDateEmployee2: Date
        let birthday1Date: Date
        let birthday2Date: Date

        beforeEach(() => {
          organization = new Organization()
          organization.id = 'myId'
          organization.name = 'shiftcode GmbH'
          createdAt = new Date()
          organization.createdAtDate = createdAt
          lastUpdated = new Date('2017-03-21')
          organization.lastUpdated = lastUpdated
          organization.active = true
          organization.count = 52

          organization.domains = ['shiftcode.ch', 'shiftcode.io', 'shiftcode.it']
          organization.randomDetails = ['sample', 26, true]

          const employees: Employee[] = []
          createdAtDateEmployee1 = new Date('2017-03-05')
          createdAtDateEmployee2 = new Date()

          employees.push(new Employee('max', 50, createdAtDateEmployee1, []))
          employees.push(new Employee('anna', 27, createdAtDateEmployee2, []))
          organization.employees = employees

          organization.cities = new Set(['zürich', 'bern'])

          birthday1Date = new Date('1975-03-05')
          birthday2Date = new Date('1987-07-07')
          organization.birthdays = new Set([
            new Birthday(birthday1Date, 'ticket to rome', 'camper van'),
            new Birthday(birthday2Date, 'car', 'gin'),
          ])

          organization.awards = new Set(['good, better, shiftcode', 'jus kiddin'])

          const events = new Set()
          events.add(new OrganizationEvent('shift the web', 1520))
          organization.events = events
          organization.transient = 'the value which is marked as transient'

          organizationAttrMap = toDb(organization, Organization)
        })

        describe('creates correct attribute map', () => {
          it('all properties are mapped', () => {
            expect(Object.keys(organizationAttrMap).length).toBe(14)
          })

          it('id', () => {
            expect(organizationAttrMap.id).toEqual({ S: 'myId' })
          })

          it('createdAtDate', () => {
            expect(organizationAttrMap.createdAtDate).toBeDefined()
            expect((<StringAttribute>organizationAttrMap.createdAtDate).S).toBeDefined()
            expect((<StringAttribute>organizationAttrMap.createdAtDate).S).toBe(createdAt.toISOString())
          })

          it('lastUpdated', () => {
            expect(organizationAttrMap.lastUpdated).toBeDefined()
            expect((<StringAttribute>organizationAttrMap.lastUpdated).S).toBeDefined()
            expect((<StringAttribute>organizationAttrMap.lastUpdated).S).toBe(lastUpdated.toISOString())
          })

          it('active', () => {
            expect(organizationAttrMap.active).toBeDefined()
            expect((<BooleanAttribute>organizationAttrMap.active).BOOL).toBeDefined()
            expect((<BooleanAttribute>organizationAttrMap.active).BOOL).toBe(true)
          })

          it('count', () => {
            expect(organizationAttrMap.count).toEqual({ N: '52' })
          })

          it('domains', () => {
            expect(organizationAttrMap.domains).toBeDefined()

            const domains = (<StringSetAttribute>organizationAttrMap.domains).SS
            expect(domains).toBeDefined()
            expect(domains.length).toBe(3)

            expect(domains[0]).toBe('shiftcode.ch')
            expect(domains[1]).toBe('shiftcode.io')
            expect(domains[2]).toBe('shiftcode.it')
          })

          it('random details', () => {
            expect(organizationAttrMap.randomDetails).toBeDefined()

            const randomDetails = (<ListAttribute>organizationAttrMap.randomDetails).L
            expect(randomDetails).toBeDefined()
            expect(randomDetails.length).toBe(3)

            expect(keyOf(randomDetails[0])).toBe('S')
            expect((<StringAttribute>randomDetails[0]).S).toBe('sample')

            expect(keyOf(randomDetails[1])).toBe('N')
            expect((<NumberAttribute>randomDetails[1]).N).toBe('26')

            expect(keyOf(randomDetails[2])).toBe('BOOL')
            expect((<BooleanAttribute>randomDetails[2]).BOOL).toBe(true)
          })

          it('employees', () => {
            expect(organizationAttrMap.employees).toBeDefined()
            const employeesL = (<ListAttribute>organizationAttrMap.employees).L
            expect(employeesL).toBeDefined()
            expect(employeesL.length).toBe(2)
            expect(employeesL[0]).toBeDefined()
            expect((<MapAttribute>employeesL[0]).M).toBeDefined()

            // test employee1
            const employee1 = (<MapAttribute>employeesL[0]).M
            expect(employee1['name']).toBeDefined()
            expect((<StringAttribute>employee1['name']).S).toBeDefined()
            expect((<StringAttribute>employee1['name']).S).toBe('max')
            expect(employee1['age']).toBeDefined()
            expect((<NumberAttribute>employee1['age']).N).toBeDefined()
            expect((<NumberAttribute>employee1['age']).N).toBe('50')
            expect(employee1['createdAt']).toBeDefined()
            expect((<StringAttribute>employee1['createdAt']).S).toBeDefined()
            expect((<StringAttribute>employee1['createdAt']).S).toBe(createdAtDateEmployee1.toISOString())

            // test employee2
            const employee2: MapAttributeValue = (<MapAttribute>employeesL[1]).M
            expect(employee2['name']).toBeDefined()
            expect(employee2['name'].S).toBeDefined()
            expect(employee2['name'].S).toBe('anna')
            expect(employee2['age']).toBeDefined()
            expect(employee2['age'].N).toBeDefined()
            expect(employee2['age'].N).toBe('27')
            expect(employee2['createdAt']).toBeDefined()
            expect(employee2['createdAt'].S).toBeDefined()
            expect(employee2['createdAt'].S).toBe(createdAtDateEmployee2.toISOString())
          })

          it('cities', () => {
            expect(organizationAttrMap.cities).toBeDefined()

            const citiesSS = (<StringSetAttribute>organizationAttrMap.cities).SS
            expect(citiesSS).toBeDefined()
            expect(citiesSS.length).toBe(2)
            expect(citiesSS[0]).toBe('zürich')
            expect(citiesSS[1]).toBe('bern')
          })

          it('birthdays', () => {
            expect(organizationAttrMap.birthdays).toBeDefined()

            const birthdays = (<ListAttribute>organizationAttrMap.birthdays).L
            expect(birthdays).toBeDefined()
            expect(birthdays.length).toBe(2)

            expect(keyOf(birthdays[0])).toBe('M')

            // birthday 1
            const birthday1 = (<MapAttribute>birthdays[0]).M
            expect(birthday1['date']).toBeDefined()
            expect(keyOf(birthday1['date'])).toBe('S')
            expect((<StringAttribute>birthday1['date']).S).toBe(birthday1Date.toISOString())

            expect(birthday1.presents).toBeDefined()
            expect(keyOf(birthday1.presents)).toBe('L')
            expect((<ListAttribute>birthday1.presents).L.length).toBe(2)
            expect(keyOf((<ListAttribute>birthday1.presents).L[0])).toBe('M')

            expect(keyOf((<ListAttribute>birthday1.presents).L[0])).toBe('M')

            const birthday1gift1 = (<MapAttribute>(<ListAttribute>birthday1.presents).L[0]).M
            expect(birthday1gift1.description).toBeDefined()
            expect(keyOf(birthday1gift1.description)).toBe('S')
            expect((<StringAttribute>birthday1gift1.description).S).toBe('ticket to rome')

            const birthday1gift2 = (<MapAttribute>(<ListAttribute>birthday1.presents).L[1]).M
            expect(birthday1gift2.description).toBeDefined()
            expect(keyOf(birthday1gift2.description)).toBe('S')
            expect((<StringAttribute>birthday1gift2.description).S).toBe('camper van')

            // birthday 2
            const birthday2 = (<MapAttribute>birthdays[1]).M
            expect(birthday2['date']).toBeDefined()
            expect(keyOf(birthday2['date'])).toBe('S')
            expect((<StringAttribute>birthday2['date']).S).toBe(birthday2Date.toISOString())

            expect(birthday2.presents).toBeDefined()
            expect(keyOf(birthday2.presents)).toBe('L')
            expect((<ListAttribute>birthday2.presents).L.length).toBe(2)
            expect(keyOf((<ListAttribute>birthday2.presents).L[0])).toBe('M')

            expect(keyOf((<ListAttribute>birthday2.presents).L[0])).toBe('M')

            const birthday2gift1 = (<MapAttribute>(<ListAttribute>birthday2.presents).L[0]).M
            expect(birthday2gift1.description).toBeDefined()
            expect(keyOf(birthday2gift1.description)).toBe('S')
            expect((<StringAttribute>birthday2gift1.description).S).toBe('car')

            const birthday2gift2 = (<MapAttribute>(<ListAttribute>birthday2.presents).L[1]).M
            expect(birthday2gift2.description).toBeDefined()
            expect(keyOf(birthday2gift2.description)).toBe('S')
            expect((<StringAttribute>birthday2gift2.description).S).toBe('gin')
          })

          it('awards', () => {
            expect(organizationAttrMap.awards).toBeDefined()
            const awards = (<ListAttribute>organizationAttrMap.awards).L
            expect(awards).toBeDefined()
            expect(awards.length).toBe(2)

            expect(keyOf(awards[0])).toBe('S')
            expect((<StringAttribute>awards[0]).S).toBe('good, better, shiftcode')

            expect(keyOf(awards[1])).toBe('S')
            expect((<StringAttribute>awards[1]).S).toBe('jus kiddin')
          })

          it('events', () => {
            expect(organizationAttrMap.events).toBeDefined()
            const events = (<ListAttribute>organizationAttrMap.events).L
            expect(events).toBeDefined()
            expect(events.length).toBe(1)

            const a = <MapAttribute>events[0]

            expect(keyOf(a)).toBe('M')
            expect(a.M.name).toBeDefined()
            expect(keyOf(a.M.name)).toBe('S')
            expect((<StringAttribute>a.M.name).S).toBe('shift the web')

            expect(a.M.participantCount).toBeDefined()
            expect(keyOf(a.M.participantCount)).toBe('N')
            expect((<NumberAttribute>a.M.participantCount).N).toBe('1520')
          })

          it('transient', () => {
            expect(organizationAttrMap.transient).toBeUndefined()
          })

          // an empty set is not a valid attribute value to be persisted either NULL:true or
          it('emptySet', () => {
            expect(organizationAttrMap.emptySet).toEqual({ NULL: true })
          })
        })
      })

      describe('model with custom mapper', () => {
        it('should map using the custom mapper', () => {
          const model = new ModelWithCustomMapperModel()
          model.id = new Id(20, 2017)
          const toDbVal: Attributes = toDb(model, ModelWithCustomMapperModel)

          expect(toDbVal.id).toBeDefined()
          expect(keyOf(toDbVal.id)).toBe('S')
          expect((<StringAttribute>toDbVal.id).S).toBe('00202017')
        })
      })

      describe('model with autogenerated id', () => {
        it('should create an uuid', () => {
          const toDbVal: Attributes = toDb(new ModelWithAutogeneratedId(), ModelWithAutogeneratedId)
          expect(toDbVal.id).toBeDefined()
          expect(keyOf(toDbVal.id)).toBe('S')
          // https://stackoverflow.com/questions/7905929/how-to-test-valid-uuid-guid
          expect((<StringAttribute>toDbVal.id).S).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
          )
        })
      })

      describe('model with non string/number/binary keys', () => {
        it('should accept date as HASH or RANGE key', () => {
          const now = new Date()
          const toDbVal: AttributeMap = toDb(new ModelWithDateAsHashKey(now), ModelWithDateAsHashKey)
          expect(toDbVal.startDate.S).toBeDefined()
          expect(toDbVal.startDate.S).toEqual(now.toISOString())
        })
        it('should accept date as HASH or RANGE key on GSI', () => {
          const now = new Date()
          const toDbVal: AttributeMap = toDb(new ModelWithDateAsIndexHashKey(0, now), ModelWithDateAsIndexHashKey)
          expect(toDbVal.creationDate.S).toBeDefined()
          expect(toDbVal.creationDate.S).toEqual(now.toISOString())
        })
        it('should throw error when no custom mapper was defined', () => {
          expect(() => {
            toDb(new ModelWithoutCustomMapper('key', 'value', 'otherValue'), ModelWithoutCustomMapper)
          }).toThrow()

          expect(() => {
            toDb(new ModelWithoutCustomMapperOnIndex('id', 'key', 'value'), ModelWithoutCustomMapperOnIndex)
          }).toThrow()
        })
      })

      describe('model with complex property values (decorators)', () => {
        let toDbVal: Attributes

        beforeEach(() => {
          toDbVal = toDb(new Product(), Product)
        })

        it('nested value', () => {
          expect(toDbVal.nestedValue).toBeDefined()
          expect((<MapAttribute>toDbVal.nestedValue).M).toBeDefined()
          expect(Object.keys((<MapAttribute>toDbVal.nestedValue).M).length).toBe(1)
          expect((<MapAttribute>toDbVal.nestedValue).M.sortedSet).toBeDefined()
          expect(keyOf((<MapAttribute>toDbVal.nestedValue).M.sortedSet)).toBe('L')
        })

        it('list', () => {
          expect(toDbVal.list).toBeDefined()
          expect(keyOf(toDbVal.list)).toBe('L')
          expect((<ListAttribute>toDbVal.list).L.length).toBe(1)
          expect(keyOf((<ListAttribute>toDbVal.list).L[0])).toBe('M')
          // expect(Object.keys(toDb.list.L[0].M).length).toBe(1);
          expect((<MapAttribute>(<ListAttribute>toDbVal.list).L[0]).M.collection).toBeDefined()
          expect(keyOf((<MapAttribute>(<ListAttribute>toDbVal.list).L[0]).M.collection)).toBe('L')
        })
      })
    })

    describe('from db', () => {
      // FIXME TEST fix this test
      describe('model with complex property values (decorators)', () => {
        let product: Product

        beforeEach(() => {
          product = fromDb(productFromDb, Product)
        })

        it('nested value', () => {
          expect(product.nestedValue).toBeDefined()
          expect(Object.getOwnPropertyNames(product.nestedValue).length).toBe(1)
          expect(product.nestedValue.sortedSet).toBeDefined()
          expect(product.nestedValue.sortedSet instanceof Set).toBeTruthy()
          expect(product.nestedValue.sortedSet.size).toBe(2)
        })
      })

      describe('model', () => {
        let organization: Organization

        beforeEach(() => {
          organization = fromDb(organizationFromDb, Organization)
        })

        it('id', () => {
          expect(organization.id).toBe('myId')
        })

        it('createdAtDate', () => {
          expect(organization.createdAtDate).toBeDefined()
          expect(organization.createdAtDate instanceof Date).toBeTruthy()
          expect(isNaN(<any>organization.createdAtDate)).toBeFalsy()
          expect(organization.createdAtDate.toISOString()).toEqual(organization1CreatedAt.toISOString())
        })

        it('lastUpdated', () => {
          expect(organization.lastUpdated).toBeDefined()
          expect(organization.lastUpdated instanceof Date).toBeTruthy()
          expect(isNaN(<any>organization.lastUpdated)).toBeFalsy()
          expect(organization.lastUpdated.toISOString()).toEqual(organization1LastUpdated.toISOString())
        })

        it('employees', () => {
          expect(organization.employees).toBeDefined()
          expect(Array.isArray(organization.employees)).toBeTruthy()
          expect(organization.employees.length).toBe(2)

          // first employee
          expect(organization.employees[0].name).toBe('max')
          expect(organization.employees[0].age).toBe(50)
          expect(organization.employees[0].createdAt instanceof Date).toBeTruthy()
          expect(isNaN(<any>organization.employees[0].createdAt)).toBeFalsy()
          expect((<Date>organization.employees[0].createdAt).toISOString()).toEqual(
            organization1Employee1CreatedAt.toISOString(),
          )

          // set is mapped to set but would expect list, should not work without extra @Sorted() decorator
          expect(organization.employees[0].sortedSet).toBeDefined()
          expect(organization.employees[0].sortedSet instanceof Set).toBeTruthy()

          // second employee
          expect(organization.employees[1].name).toBe('anna')
          expect(organization.employees[1].age).toBe(27)
          expect(organization.employees[1].createdAt instanceof Date).toBeTruthy()
          expect(isNaN(<any>organization.employees[1].createdAt)).toBeFalsy()
          expect(organization.employees[1].createdAt).toEqual(organization1Employee2CreatedAt)
          expect(organization.employees[1].sortedSet).toBeDefined()
          expect(organization.employees[1].sortedSet instanceof Set).toBeTruthy()
        })

        it('active', () => {
          expect(organization.active).toBe(true)
        })

        it('count', () => {
          expect(organization.count).toBe(52)
        })

        it('cities', () => {
          expect(organization.cities).toBeDefined()
          expect(organization.cities instanceof Set).toBeTruthy()

          const cities: Set<string> = organization.cities
          expect(cities.size).toBe(2)
          expect(Array.from(cities)[0]).toBe('zürich')
          expect(Array.from(cities)[1]).toBe('bern')
        })

        // it('awardWinningYears', () => {
        //   expect(organization.awardWinningYears).toBeDefined();
        //   expect(organization.awardWinningYears instanceof Set).toBeTruthy();
        //
        //   const awardWinningYears: Set<number> = organization.awardWinningYears;
        //   expect(awardWinningYears.size).toBe(3);
        //   expect(Array.from(awardWinningYears)[0]).toBe(2002);
        //   expect(Array.from(awardWinningYears)[1]).toBe(2015);
        //   expect(Array.from(awardWinningYears)[2]).toBe(2017);
        // });
        //
        // it('mixedList', () => {
        //   expect(organization.mixedList).toBeDefined();
        //   expect(Array.isArray(organization.mixedList)).toBeTruthy();
        //
        //   const mixedList: any[] = organization.mixedList;
        //   expect(mixedList.length).toBe(3);
        //   expect(mixedList[0]).toBe('sample');
        //   expect(mixedList[1]).toBe(26);
        //   expect(mixedList[2]).toBe(true);
        // });
        //
        // it('sortedSet', () => {
        //   expect(organization.setWithComplexSorted).toBeDefined();
        //   expect(organization.setWithComplexSorted instanceof Set).toBeTruthy();
        //
        //   const sortedSet: Set<string> = organization.setWithComplexSorted;
        //   expect(sortedSet.size).toBe(2);
        //   expect(Array.from(sortedSet)[0]).toBe('1');
        //   expect(Array.from(sortedSet)[1]).toBe('2');
        // });
      })
    })
  })
})

function keyOf(attributeValue: Attribute): string | null {
  if (attributeValue && Object.keys(attributeValue).length) {
    return Object.keys(attributeValue)[0]
  } else {
    return null
  }
}
