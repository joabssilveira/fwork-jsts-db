import { SchemaFieldTypes } from "redis"
import { RedisConnection, RedisDataSource, RedisWhere } from "."
import { IWhereOptions } from ".."
import { CommonUtils, ConsoleLogUtils } from "fwork.common.typescript"

// DECLARE YOUR MODEL INTERFACES OR CLASSES
interface IMyInterface {
  myPrimaryKey: string,
  prop1: string,
  prop2?: number,
  propBoolean: boolean,
  // THIS IS A OBJECT PROP
  child?: IMyChildInterface,
  // THIS IS A ARRAY PROP
  children?: IMyChildInterface[]
}

interface IMyChildInterface {
  prop1: string,
}

// EXTENDS CONNECTION
export class MyRedisConnection extends RedisConnection {
  myCollectionPrefix = 'my-collection-name'

  async open() {
    super.open()

    try {
      var r = await this.client?.ft._LIST()
      if (r?.indexOf(`idx:${this.myCollectionPrefix}`) !== -1) {
        this.client?.ft.dropIndex(`idx:${this.myCollectionPrefix}`)
      }
    } catch (error) {
      console.log(error)
    }

    this.createIndexForMyCollection()
  }

  // CREATE A INDEX FOR YOUR COLLECTION TO SEARCH
  async createIndexForMyCollection() {
    try {
      await this.client?.ft.create(`idx:${this.myCollectionPrefix}`, {
        '$.myPrimaryKey': {
          // TO STRING FIELDS, USE TAG
          type: SchemaFieldTypes.TAG,
          SORTABLE: true,
          AS: 'myPrimaryKey'
        },
        '$.prop1': {
          type: SchemaFieldTypes.TAG,
          SORTABLE: true,
          AS: 'prop1'
        },
        '$.prop2': {
          type: SchemaFieldTypes.NUMERIC,
          SORTABLE: true,
          AS: 'prop2'
        },
        '$.propBoolean': {
          type: SchemaFieldTypes.NUMERIC,
          SORTABLE: true,
          AS: 'propBoolean'
        },
        // THIS IS A CHILD PROP
        '$.child.prop1': {
          type: SchemaFieldTypes.TAG,
          SORTABLE: true,
          AS: 'childProp1'
        },
        // THIS IS A CHILDREN ARRAY PROP
        '$.children[*].prop1': {
          type: SchemaFieldTypes.TAG,
          SORTABLE: true,
          AS: 'childrenProp1'
        },
      }, {
        ON: 'JSON',
        PREFIX: this.myCollectionPrefix
      })
    } catch (e: any) {
      console.error(e)
    }
  }
}

// MAKE A INTERFACE BASED ON COLLECTION INDEX
interface IMyInterfaceForSearch {
  myPrimaryKey: string,
  prop1: string,
  prop2: number,
  propBoolean: boolean,
  // THE FIELDS BELOW ARE ACCORDING THE FIELDS DECLARED IN THE INDEX ABOVE
  childProp1: string,
  childrenProp1: string
}

// CONNECT TO REDIS 
const conn = new MyRedisConnection()
conn.open()

// INSTANCIATE A NEW DATASOURCE
const ds = new RedisDataSource<IMyInterface, Partial<IMyInterfaceForSearch>>(conn, conn.myCollectionPrefix, 'myPrimaryKey')

for (var key = 1; key <= 3; key++) {
  ConsoleLogUtils.Highlight({
    text: `Deleteing record in database ${key}`
  })
  ds.delete({
    where: key.toString()
  })
}

for (var key = 1; key <= 3; key++) {
  ConsoleLogUtils.Highlight({
    text: `Creating record in database ${key}`
  })
  ds.create({
    data: {
      // myPrimaryKey: key.toString(),
      myPrimaryKey: CommonUtils.getNewUuid(),
      prop1: `value${key}`,
      prop2: key,
      propBoolean: false,
      child: {
        prop1: `child${key}`
      },
      children: [{
        prop1: `children${key}a`
      }, {
        prop1: `children${key}b`
      }]
    }
  })
}

ds.create({
  data: {
    myPrimaryKey: key.toString(),
    prop1: `value${key}`,
    prop2: key,
    propBoolean: true,
    child: {
      prop1: `child${key}`
    },
    children: [{
      prop1: `children${key}a`
    }, {
      prop1: `children${key}b`
    }]
  }
})
// MAKING QUERIES

// RETURNS RECORDS WITH prop1='value1' and prop2=1
const q1: Partial<IMyInterfaceForSearch> | IWhereOptions<IMyInterfaceForSearch> = {
  prop1: 'value1',
  prop2: 1,
}

// query equivalent to above, note that '$eq' is used by default when not declared
const q1a: Partial<IMyInterfaceForSearch> | IWhereOptions<IMyInterfaceForSearch> = {
  $eq: {
    prop1: 'value1',
    prop2: 1,
  }
}

// query equivalent to above, '$and' is used by default when not declared
const q1b: Partial<IMyInterfaceForSearch> | IWhereOptions<IMyInterfaceForSearch> = {
  $and: [{
    prop1: 'value1'
  }, {
    prop2: 1
  }]
}

// RETURNS RECORDS WITH prop1='value2' and prop2!=5
const q2: Partial<IMyInterfaceForSearch> | IWhereOptions<IMyInterfaceForSearch> = {
  $eq: {
    prop1: 'value2',
  },
  $ne: {
    prop2: 5,
  }
}

// query equivalent to above
const q2a: Partial<IMyInterfaceForSearch> | IWhereOptions<IMyInterfaceForSearch> = {
  prop1: 'value2',
  $ne: {
    prop2: 5,
  }
}

// query equivalent to above
const q2b: Partial<IMyInterfaceForSearch> | IWhereOptions<IMyInterfaceForSearch> = {
  $and: [
    {
      prop1: 'value2',
    },
    {
      $ne: {
        prop2: 5,
      }
    }
  ]
}

// query equivalent to above
const q2c: Partial<IMyInterfaceForSearch> | IWhereOptions<IMyInterfaceForSearch> = {
  $and: [
    {
      $eq: {
        prop1: 'value2',
      }
    },
    {
      $ne: {
        prop2: 5,
      }
    }
  ]
}

// RETURNS RECORDS WITH prop1='value1' or prop2=2
const q3: Partial<IMyInterfaceForSearch> | IWhereOptions<IMyInterfaceForSearch> = {
  $or: [
    {
      prop1: 'value1',
    },
    {
      prop2: 2
    }
  ]
}

// query equivalent to above
const q3a: Partial<IMyInterfaceForSearch> | IWhereOptions<IMyInterfaceForSearch> = {
  $or: [
    {
      $eq: {
        prop1: 'value1',
      }
    },
    {
      $eq: {
        prop2: 2
      }
    }
  ]
}

// RETURNS RECORDS WITH prop1='value1' or prop2!=2
const q3b: Partial<IMyInterfaceForSearch> | IWhereOptions<IMyInterfaceForSearch> = {
  $or: [
    {
      prop1: 'value1',
    },
    {
      $ne: {
        prop2: 2
      }
    }
  ]
}

// MERGING OPERATORS. RESULT: (prop1 = 'value1') or (prop1 = 'value2' and prop2 != 3)
const q4: Partial<IMyInterfaceForSearch> | IWhereOptions<IMyInterfaceForSearch> = {
  $and: [
    {
      prop1: 'value1',
    },
    {
      $or: [
        { prop1: 'value2' },
        { $ne: { prop2: 3 } }
      ]
    }
  ],
}

// CHILD OBJECT
const q5: Partial<IMyInterfaceForSearch> | IWhereOptions<IMyInterfaceForSearch> = {
  childProp1: 'child1'
}

// CHILDREN OBJECT
const q6: Partial<IMyInterfaceForSearch> | IWhereOptions<IMyInterfaceForSearch> = {
  childrenProp1: 'children1a'
}

const q7: Partial<IMyInterfaceForSearch> | IWhereOptions<IMyInterfaceForSearch> = {
  propBoolean: false
}

ConsoleLogUtils.Highlight({
  text: 'Showing queries passed to redis'
})
let result = new RedisWhere<IMyInterfaceForSearch>().getWhere(q1)
console.log(`q1: ${result}`)
result = new RedisWhere<IMyInterfaceForSearch>().getWhere(q1a)
console.log(`q1a: ${result}`)
result = new RedisWhere<IMyInterfaceForSearch>().getWhere(q1b)
console.log(`q1b: ${result}`)
result = new RedisWhere<IMyInterfaceForSearch>().getWhere(q2a)
console.log(`q2: ${result}`)
result = new RedisWhere<IMyInterfaceForSearch>().getWhere(q2b)
console.log(`q2a: ${result}`)
result = new RedisWhere<IMyInterfaceForSearch>().getWhere(q2c)
console.log(`q2b: ${result}`)
result = new RedisWhere<IMyInterfaceForSearch>().getWhere(q3)
console.log(`q2c: ${result}`)
result = new RedisWhere<IMyInterfaceForSearch>().getWhere(q3a)
console.log(`q3: ${result}`)
result = new RedisWhere<IMyInterfaceForSearch>().getWhere(q3b)
console.log(`q3a: ${result}`)
result = new RedisWhere<IMyInterfaceForSearch>().getWhere(q4)
console.log(`q3b: ${result}`)
result = new RedisWhere<IMyInterfaceForSearch>().getWhere(q4)
console.log(`q4: ${result}`)
result = new RedisWhere<IMyInterfaceForSearch>().getWhere(q5)
console.log(`q5: ${result}`)
result = new RedisWhere<IMyInterfaceForSearch>().getWhere(q6)
console.log(`q6: ${result}`);
result = new RedisWhere<IMyInterfaceForSearch>().getWhere(q7)
console.log(`q7: ${result}`);

// EXECUTING QUERIES
(async () => {

  ConsoleLogUtils.Highlight({
    text: `Executing queries...`
  })

  console.log('q1')
  let qRes = await ds.read({
    where: q1
  })
  let data = qRes?.payload
  console.log(JSON.stringify(data, null, 4))

  console.log('q1a')
  qRes = await ds.read({
    where: q1a
  })
  data = qRes?.payload
  console.log(JSON.stringify(data, null, 4))

  console.log('q1b')
  qRes = await ds.read({
    where: q1b
  })
  data = qRes?.payload
  console.log(JSON.stringify(data, null, 4))

  console.log('q2')
  qRes = await ds.read({
    where: q2
  })
  data = qRes?.payload
  console.log(JSON.stringify(data, null, 4))

  console.log('q2a')
  qRes = await ds.read({
    where: q2a
  })
  data = qRes?.payload
  console.log(JSON.stringify(data, null, 4))

  console.log('q2b')
  qRes = await ds.read({
    where: q2b
  })
  data = qRes?.payload
  console.log(JSON.stringify(data, null, 4))

  console.log('q2c')
  qRes = await ds.read({
    where: q2c
  })
  data = qRes?.payload
  console.log(JSON.stringify(data, null, 4))

  console.log('q3')
  qRes = await ds.read({
    where: q3
  })
  data = qRes?.payload
  console.log(JSON.stringify(data, null, 4))

  console.log('q3a')
  qRes = await ds.read({
    where: q3a
  })
  data = qRes?.payload
  console.log(JSON.stringify(data, null, 4))

  console.log('q3b')
  qRes = await ds.read({
    where: q3b
  })
  data = qRes?.payload
  console.log(JSON.stringify(data, null, 4))

  console.log('q4')
  qRes = await ds.read({
    where: {
      $and: [
        {
          prop1: 'value1',
        },
        {
          $or: [
            { prop1: 'value2' },
            { $ne: { prop2: 3 } }
          ]
        }
      ],
    }
  })
  data = qRes?.payload
  console.log(JSON.stringify(data, null, 4))

  console.log('q5')
  qRes = await ds.read({
    where: q5
  })
  data = qRes?.payload
  console.log(JSON.stringify(data, null, 4))

  console.log('q6')
  qRes = await ds.read({
    where: q6
  })
  data = qRes?.payload
  console.log(JSON.stringify(data, null, 4))

  console.log('q7')
  qRes = await ds.read({
    where: q7
  })
  data = qRes?.payload
  console.log(JSON.stringify(data, null, 4))

})()

// execute following command line in the parent folder to run this file:
// npx ts-node ./redis/examples.ts