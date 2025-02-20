import _find from 'lodash/find';
import _flatten from 'lodash/flatten';
import _get from 'lodash/get';
import _groupBy from 'lodash/groupBy';
import _head from 'lodash/head';
import _mapValues from 'lodash/mapValues';
import _replace from 'lodash/replace';
import _uniq from 'lodash/uniq';
import _without from 'lodash/without';
import _isEmpty from 'lodash/isEmpty';
import { convertValues, getAxiosInstance, mapFields } from './utils';
import { pluralizeFirestoreCollection } from '@/helpers';
import { toRaw } from 'vue';

const userSelectFields = ['name', 'assessmentPid', 'username', 'studentData', 'schools', 'classes'];

const assignmentSelectFields = [
  'assessments',
  'assigningOrgs',
  'completed',
  'dateAssigned',
  'dateClosed',
  'dateOpened',
  'readOrgs',
  'started',
  'id',
];

export const getAssignmentsRequestBody = ({
  adminId,
  orgType,
  orgId,
  orgArray = [],
  aggregationQuery,
  pageLimit,
  page,
  paginate = true,
  select = assignmentSelectFields,
  filter = {},
  orderBy = [],
  isCollectionGroupQuery = true,
}) => {
  const requestBody = {
    structuredQuery: {},
  };

  if (!aggregationQuery) {
    if (paginate) {
      requestBody.structuredQuery.limit = pageLimit;
      requestBody.structuredQuery.offset = page * pageLimit;
    }

    if (select.length > 0) {
      requestBody.structuredQuery.select = {
        fields: select.map((field) => ({ fieldPath: field })),
      };
    }
  }

  requestBody.structuredQuery.from = [
    {
      collectionId: 'assignments',
      allDescendants: isCollectionGroupQuery,
    },
  ];

  if (adminId && (orgId || orgArray)) {
    requestBody.structuredQuery.where = {
      compositeFilter: {
        op: 'AND',
        filters: [
          {
            fieldFilter: {
              field: { fieldPath: 'id' },
              op: 'EQUAL',
              value: { stringValue: adminId },
            },
          },
        ],
      },
    };

    if (!_isEmpty(orgArray)) {
      requestBody.structuredQuery.where.compositeFilter.filters.push({
        fieldFilter: {
          field: { fieldPath: `readOrgs.${pluralizeFirestoreCollection(orgType)}` },
          op: 'ARRAY_CONTAINS_ANY',
          value: {
            arrayValue: {
              values: [
                orgArray.map((orgId) => {
                  return { stringValue: orgId };
                }),
              ],
            },
          },
        },
      });
    } else {
      requestBody.structuredQuery.where.compositeFilter.filters.push({
        fieldFilter: {
          field: { fieldPath: `readOrgs.${pluralizeFirestoreCollection(orgType)}` },
          op: 'ARRAY_CONTAINS',
          value: { stringValue: orgId },
        },
      });
    }

    if (!_isEmpty(orderBy)) {
      requestBody.structuredQuery.orderBy = orderBy;
    }

    if (!_isEmpty(filter)) {
      requestBody.structuredQuery.where.compositeFilter.filters.push({
        fieldFilter: {
          field: { fieldPath: `userData.${filter.field}` },
          op: 'EQUAL',
          value: { stringValue: filter.value },
        },
      });
    }
  } else {
    const currentDate = new Date().toISOString();
    requestBody.structuredQuery.where = {
      fieldFilter: {
        field: { fieldPath: 'dateClosed' },
        op: 'GREATER_THAN_OR_EQUAL',
        value: { timestampValue: currentDate },
      },
    };
  }

  if (aggregationQuery) {
    return {
      structuredAggregationQuery: {
        ...requestBody,
        aggregations: [
          {
            alias: 'count',
            count: {},
          },
        ],
      },
    };
  }

  return requestBody;
};

export const getUsersByAssignmentIdRequestBody = ({
  adminId,
  orgType,
  orgId,
  filter,
  aggregationQuery,
  pageLimit,
  page,
  paginate = true,
  select = userSelectFields,
}) => {
  const requestBody = {
    structuredQuery: {},
  };

  if (!aggregationQuery) {
    if (paginate) {
      requestBody.structuredQuery.limit = pageLimit;
      requestBody.structuredQuery.offset = page * pageLimit;
    }

    if (select.length > 0) {
      requestBody.structuredQuery.select = {
        fields: select.map((field) => ({ fieldPath: field })),
      };
    }
  }

  requestBody.structuredQuery.from = [
    {
      collectionId: 'users',
      allDescendants: false,
    },
  ];

  requestBody.structuredQuery.where = {
    compositeFilter: {
      op: 'AND',
      filters: [
        {
          fieldFilter: {
            field: { fieldPath: `${pluralizeFirestoreCollection(orgType)}.current` },
            op: 'ARRAY_CONTAINS',
            value: { stringValue: orgId },
          },
        },
        {
          fieldFilter: {
            field: { fieldPath: `assignments.assigned` },
            op: 'ARRAY_CONTAINS_ANY',
            value: { arrayValue: { values: [{ stringValue: adminId }] } },
          },
        },
      ],
    },
  };

  if (filter) {
    requestBody.structuredQuery.where.compositeFilter.filters.push({
      fieldFilter: {
        field: { fieldPath: filter[0].field },
        op: 'EQUAL',
        value: { stringValue: filter[0].value },
      },
    });
  }

  if (aggregationQuery) {
    return {
      structuredAggregationQuery: {
        ...requestBody,
        aggregations: [
          {
            alias: 'count',
            count: {},
          },
        ],
      },
    };
  }

  return requestBody;
};

export const getFilteredScoresRequestBody = ({
  adminId,
  orgId,
  orgType,
  orgArray,
  filter,
  select = ['scores'],
  aggregationQuery,
  paginate = true,
  page,
  pageLimit,
}) => {
  const requestBody = {
    structuredQuery: {},
  };
  if (!aggregationQuery) {
    if (paginate) {
      requestBody.structuredQuery.limit = pageLimit;
      requestBody.structuredQuery.offset = page * pageLimit;
    }
    requestBody.structuredQuery.select = {
      fields: select.map((field) => ({ fieldPath: field })),
    };
  }
  requestBody.structuredQuery.from = [
    {
      collectionId: 'runs',
      allDescendants: true,
    },
  ];
  requestBody.structuredQuery.where = {
    compositeFilter: {
      op: 'AND',
      filters: [
        {
          fieldFilter: {
            field: { fieldPath: 'assignmentId' },
            op: 'EQUAL',
            value: { stringValue: adminId },
          },
        },
        {
          fieldFilter: {
            field: { fieldPath: 'taskId' },
            op: 'EQUAL',
            value: { stringValue: filter.taskId },
          },
        },
        {
          fieldFilter: {
            field: { fieldPath: 'bestRun' },
            op: 'EQUAL',
            value: { booleanValue: true },
          },
        },
      ],
    },
  };
  if (!_isEmpty(orgArray)) {
    requestBody.structuredQuery.where.compositeFilter.filters.push({
      fieldFilter: {
        field: { fieldPath: `readOrgs.${pluralizeFirestoreCollection(orgType)}` },
        op: 'ARRAY_CONTAINS_ANY',
        value: {
          arrayValue: {
            values: [
              orgArray.map((orgId) => {
                return { stringValue: orgId };
              }),
            ],
          },
        },
      },
    });
  } else {
    requestBody.structuredQuery.where.compositeFilter.filters.push({
      fieldFilter: {
        field: { fieldPath: `readOrgs.${pluralizeFirestoreCollection(orgType)}` },
        op: 'ARRAY_CONTAINS',
        value: { stringValue: orgId },
      },
    });
  }
  if (filter) {
    requestBody.structuredQuery.where.compositeFilter.filters.push({
      compositeFilter: {
        op: 'OR',
        filters: [
          {
            compositeFilter: {
              op: 'AND',
              filters: [
                {
                  compositeFilter: {
                    op: 'OR',
                    filters: [
                      {
                        fieldFilter: {
                          field: { fieldPath: 'userData.schoolLevel' },
                          op: 'EQUAL',
                          value: { stringValue: 'elementary' },
                        },
                      },
                      {
                        fieldFilter: {
                          field: { fieldPath: 'userData.schoolLevel' },
                          op: 'EQUAL',
                          value: { stringValue: 'early-childhood' },
                        },
                      },
                    ],
                  },
                },
                // Add filter inequalities here
                // Inequalities that match elementary school students
              ],
            },
          },
          {
            compositeFilter: {
              op: 'AND',
              filters: [
                {
                  compositeFilter: {
                    op: 'OR',
                    filters: [
                      {
                        fieldFilter: {
                          field: { fieldPath: 'userData.schoolLevel' },
                          op: 'EQUAL',
                          value: { stringValue: 'middle' },
                        },
                      },
                      {
                        fieldFilter: {
                          field: { fieldPath: 'userData.schoolLevel' },
                          op: 'EQUAL',
                          value: { stringValue: 'high' },
                        },
                      },
                      {
                        fieldFilter: {
                          field: { fieldPath: 'userData.schoolLevel' },
                          op: 'Equal',
                          value: { stringValue: 'postsecondary' },
                        },
                      },
                    ],
                  },
                },
                // Add filter inequalities here
                // Inequalities that match middle and high school students
              ],
            },
          },
        ],
      },
    });
    if (filter.value === 'Green') {
      // If the filter requests average students, define filters in which
      // elementary school students have the inequality percentileScore >= 50
      requestBody.structuredQuery.where.compositeFilter.filters[4].compositeFilter.filters[0].compositeFilter.filters.push(
        {
          fieldFilter: {
            field: { fieldPath: filter.field },
            op: 'GREATER_THAN_OR_EQUAL',
            value: { doubleValue: 50 },
          },
        },
      );
      // middle/high school students have the inequality categoryScore >= upper cutoff
      requestBody.structuredQuery.where.compositeFilter.filters[4].compositeFilter.filters[1].compositeFilter.filters.push(
        {
          fieldFilter: {
            field: { fieldPath: filter.field },
            op: 'GREATER_THAN_OR_EQUAL',
            value: { doubleValue: filter.cutoffs.above }, // For middle/high students, the same field applies but the inequality changes.
          },
        },
      );
    } else if (filter.value === 'Yellow') {
      // If the filter requests some support students, define filters in which
      // elementary school students have the inequality percentileScore < 50 and > 25
      requestBody.structuredQuery.where.compositeFilter.filters[4].compositeFilter.filters[0].compositeFilter.filters.push(
        {
          fieldFilter: {
            field: { fieldPath: filter.field },
            op: 'LESS_THAN',
            value: { doubleValue: 50 },
          },
        },
        {
          fieldFilter: {
            field: { fieldPath: filter.field },
            op: 'GREATER_THAN',
            value: { doubleValue: 25 },
          },
        },
      );
      // middle/high school students have the inequality categoryScore < upper cutoff and > some cutoff
      requestBody.structuredQuery.where.compositeFilter.filters[4].compositeFilter.filters[1].compositeFilter.filters.push(
        {
          fieldFilter: {
            field: { fieldPath: filter.field },
            op: 'LESS_THAN',
            value: { doubleValue: filter.cutoffs.above }, // For middle/high students, the same field applies but the inequality changes.
          },
        },
        {
          fieldFilter: {
            field: { fieldPath: filter.field },
            op: 'GREATER_THAN',
            value: { doubleValue: filter.cutoffs.some }, // For middle/high students, the same field applies but the inequality changes.
          },
        },
      );
    } else if (filter.value === 'Pink') {
      // If the filter requests extra support students, define filters in which
      // elementary school students have the inequality percentileScore <= 25
      requestBody.structuredQuery.where.compositeFilter.filters[4].compositeFilter.filters[0].compositeFilter.filters.push(
        {
          fieldFilter: {
            field: { fieldPath: filter.field },
            op: 'LESS_THAN_OR_EQUAL',
            value: { doubleValue: 25 },
          },
        },
      );
      // middle/high school students have the inequality categoryScore <= some cutoff
      requestBody.structuredQuery.where.compositeFilter.filters[4].compositeFilter.filters[1].compositeFilter.filters.push(
        {
          fieldFilter: {
            field: { fieldPath: filter.field },
            op: 'LESS_THAN_OR_EQUAL',
            value: { doubleValue: filter.cutoffs.some }, // For middle/high students, the same field applies but the inequality changes.
          },
        },
      );
    }
  }
  if (aggregationQuery) {
    return {
      structuredAggregationQuery: {
        ...requestBody,
        aggregations: [
          {
            alias: 'count',
            count: {},
          },
        ],
      },
    };
  }
  return requestBody;
};

export const getScoresRequestBody = ({
  runIds,
  orgType,
  orgId,
  aggregationQuery,
  pageLimit,
  page,
  paginate = true,
  select = ['scores'],
}) => {
  const requestBody = {
    structuredQuery: {},
  };

  if (!aggregationQuery) {
    if (paginate) {
      requestBody.structuredQuery.limit = pageLimit;
      requestBody.structuredQuery.offset = page * pageLimit;
    }

    requestBody.structuredQuery.select = {
      fields: select.map((field) => ({ fieldPath: field })),
    };
  }

  requestBody.structuredQuery.from = [
    {
      collectionId: 'runs',
      allDescendants: true,
    },
  ];

  requestBody.structuredQuery.where = {
    compositeFilter: {
      op: 'AND',
      filters: [
        {
          fieldFilter: {
            field: { fieldPath: 'id' },
            op: 'IN',
            value: {
              arrayValue: {
                values: [
                  runIds.map((runId) => {
                    return { stringValue: runId };
                  }),
                ],
              },
            },
          },
        },
        {
          fieldFilter: {
            field: { fieldPath: `readOrgs.${pluralizeFirestoreCollection(orgType)}` },
            op: 'ARRAY_CONTAINS',
            value: { stringValue: orgId },
          },
        },
      ],
    },
  };

  if (aggregationQuery) {
    return {
      structuredAggregationQuery: {
        ...requestBody,
        aggregations: [
          {
            alias: 'count',
            count: {},
          },
        ],
      },
    };
  }

  return requestBody;
};

export const assignmentCounter = (adminId, orgType, orgId, filters = []) => {
  const adminAxiosInstance = getAxiosInstance();
  const appAxiosInstance = getAxiosInstance('app');

  // Only allow one non-org filter
  let nonOrgFilter = null;
  let orgFilters = null;
  filters.forEach((filter) => {
    if (filter.collection === 'schools') {
      orgFilters = filter;
    } else if (filter.collection !== 'schools') {
      if (nonOrgFilter) {
        throw new Error('You may specify at most one filter');
      } else {
        nonOrgFilter = filter;
      }
    }
  });
  let requestBody;
  if (nonOrgFilter && nonOrgFilter.collection === 'scores') {
    requestBody = getFilteredScoresRequestBody({
      adminId: adminId,
      orgType: orgType,
      orgId: orgId,
      filter: _head(filters),
      aggregationQuery: true,
    });
    return appAxiosInstance.post(':runAggregationQuery', requestBody).then(({ data }) => {
      return Number(convertValues(data[0].result?.aggregateFields?.count));
    });
  } else {
    let userFilter = null;
    let orgFilter = null;
    if (nonOrgFilter && nonOrgFilter.collection === 'users') {
      userFilter = filters[0];
    }
    if (orgFilters && orgFilters.collection === 'schools') {
      orgFilter = orgFilters.value;
    }
    const requestBody = getAssignmentsRequestBody({
      adminId: adminId,
      orgType: orgFilter ? 'school' : orgType,
      orgId: orgFilter ? null : orgId,
      orgArray: orgFilter,
      aggregationQuery: true,
      filter: userFilter,
    });
    return adminAxiosInstance.post(':runAggregationQuery', requestBody).then(({ data }) => {
      return Number(convertValues(data[0].result?.aggregateFields?.count));
    });
  }
};

export const assignmentPageFetcher = async (
  adminId,
  orgType,
  orgId,
  pageLimit,
  page,
  includeScores = false,
  select = undefined,
  paginate = true,
  filters = [],
  orderBy = [],
) => {
  const adminAxiosInstance = getAxiosInstance();
  const appAxiosInstance = getAxiosInstance('app');

  // Only allow one non-org filter
  let nonOrgFilter = null;
  let orgFilters = null;
  filters.forEach((filter) => {
    if (filter.collection === 'schools') {
      orgFilters = filter;
    } else if (filter.collection !== 'schools') {
      if (nonOrgFilter) {
        throw new Error('You may specify at most one filter');
      } else {
        nonOrgFilter = filter;
      }
    }
  });

  // Handle filtering based on scores
  if (nonOrgFilter && nonOrgFilter.collection === 'scores') {
    let orgFilter = null;
    if (orgFilters && orgFilters.collection === 'schools') {
      orgFilter = orgFilters.value;
    }
    const requestBody = getFilteredScoresRequestBody({
      adminId: adminId,
      orgType: orgFilter ? 'school' : orgType,
      orgId: orgFilter ? null : orgId,
      orgArray: orgFilter,
      filter: nonOrgFilter,
      aggregationQuery: false,
      paginate: true,
      page: page.value,
      pageLimit: pageLimit.value,
    });
    console.log(
      `Fetching page ${page.value} for ${adminId} with filter ${filters[0].value} on field ${filters[0].field}`,
    );
    return appAxiosInstance.post(':runQuery', requestBody).then(async ({ data }) => {
      const scoresData = mapFields(data, true);

      // Generate a list of user docs paths
      const userDocPaths = _uniq(
        _without(
          data.map((scoreDoc) => {
            if (scoreDoc.document?.name) {
              return _replace(scoreDoc.document.name.split('/runs/')[0], 'gse-roar-assessment', 'gse-roar-admin');
            } else {
              return undefined;
            }
          }),
          undefined,
        ),
      );

      // Use a batch get to grab the user docs
      const batchUserDocs = await adminAxiosInstance
        .post(':batchGet', {
          documents: userDocPaths,
          mask: { fieldPaths: userSelectFields },
        })
        .then(({ data }) => {
          return _without(
            data.map(({ found }) => {
              if (found) {
                return {
                  name: found.name,
                  userId: found.name.split('/users/')[1],
                  data: _mapValues(found.fields, (value) => convertValues(value)),
                };
              }
              return undefined;
            }),
            undefined,
          );
        });

      // Generate a list of assignment doc paths
      const assignmentDocPaths = userDocPaths.map((userDocPath) => {
        return `${userDocPath}/assignments/${adminId}`;
      });

      // Batch get assignment docs
      const batchAssignmentDocs = await adminAxiosInstance
        .post(':batchGet', {
          documents: assignmentDocPaths,
          mask: { fieldPaths: assignmentSelectFields },
        })
        .then(({ data }) => {
          return _without(
            data.map(({ found }) => {
              if (found) {
                return {
                  name: found.name,
                  userId: found.name.split('/users/')[1].split('/')[0],
                  data: _mapValues(found.fields, (value) => convertValues(value)),
                };
              }
              return undefined;
            }),
            undefined,
          );
        });

      // Merge the scores into the assignment object
      const unretrievedScores = [];
      const initialScoredAssignments = batchAssignmentDocs.map((assignment) => {
        const scoredAssessments = _without(
          assignment.data.assessments.map((assessment) => {
            const runId = assessment.runId;
            const scoresObject = _get(_find(scoresData, { id: runId }), 'scores');
            if (!scoresObject && runId) {
              const runPath = `projects/gse-roar-assessment/databases/(default)/documents/users/${assignment.userId}/runs/${runId}`;
              unretrievedScores.push(runPath);
            }
            return {
              ...assessment,
              scores: scoresObject,
            };
          }),
          undefined,
        );
        return {
          userId: assignment.userId,
          data: {
            ...assignment.data,
            assessments: scoredAssessments,
          },
        };
      });

      // Use the list of unretrieved scores and batchGet
      const otherScores = await appAxiosInstance
        .post(':batchGet', {
          documents: unretrievedScores,
          mask: { fieldPaths: ['scores'] },
        })
        .then(({ data }) => {
          return _without(
            data.map(({ found }) => {
              if (found) {
                return {
                  id: found.name.split('/runs/')[1],
                  ..._mapValues(found.fields, (value) => convertValues(value)),
                };
              }
              return undefined;
            }),
            undefined,
          );
        });

      // Merge the newly retrieved scores with the scoredAssignments object
      const scoredAssignments = initialScoredAssignments.map((assignment) => {
        const scoredAssessments = assignment.data.assessments.map((assessment) => {
          const runId = assessment.runId;
          const runScores = _get(_find(otherScores, { id: runId }), 'scores');
          if (runScores) {
            return {
              ...assessment,
              scores: runScores,
            };
          } else {
            return assessment;
          }
        });
        return {
          userId: assignment.userId,
          data: {
            ...assignment.data,
            assessments: scoredAssessments,
          },
        };
      });

      // Integrate the assignment and scores objects
      return _without(
        data.map((score) => {
          if (_get(score, 'document')) {
            const userId = score.document.name.split('/users/')[1].split('/runs/')[0];
            const assignmentDoc = _find(scoredAssignments, { userId: userId });
            const userDoc = _find(batchUserDocs, { userId: userId });
            return {
              user: userDoc.data,
              assignment: assignmentDoc.data,
            };
          } else {
            return undefined;
          }
        }),
        undefined,
      );
    });
  } else {
    let userFilter = null;
    let orgFilter = null;
    if (nonOrgFilter && nonOrgFilter.collection === 'users') {
      userFilter = nonOrgFilter;
    }
    if (orgFilters && orgFilters.collection === 'schools') {
      orgFilter = orgFilters.value;
    }
    const requestBody = getAssignmentsRequestBody({
      adminId: adminId,
      orgType: orgFilter ? 'school' : orgType,
      orgId: orgFilter ? null : orgId,
      orgArray: orgFilter,
      aggregationQuery: false,
      pageLimit: pageLimit.value,
      page: page.value,
      paginate: paginate,
      select: select,
      filter: userFilter,
      orderBy: toRaw(orderBy),
    });
    console.log(`Fetching page ${page.value} for ${adminId}`);
    return adminAxiosInstance.post(':runQuery', requestBody).then(async ({ data }) => {
      const assignmentData = mapFields(data, true);

      // Get User docs
      const userDocPaths = _uniq(
        _without(
          data.map((adminDoc) => {
            if (adminDoc.document?.name) {
              return adminDoc.document.name.split('/assignments/')[0];
            } else {
              return undefined;
            }
          }),
          undefined,
        ),
      );

      // Use batchGet to get all user docs with one post request
      const batchUserDocs = await adminAxiosInstance
        .post(':batchGet', {
          documents: userDocPaths,
          mask: { fieldPaths: userSelectFields },
        })
        .then(({ data }) => {
          return _without(
            data.map(({ found }) => {
              if (found) {
                return {
                  name: found.name,
                  data: _mapValues(found.fields, (value) => convertValues(value)),
                };
              }
              return undefined;
            }),
            undefined,
          );
        });

      // But the order of batchGet is not guaranteed, so we need to match the user
      // docs back with their assignments.
      const scoresObj = assignmentData.map((assignment) => {
        const user = batchUserDocs.find((userDoc) => userDoc.name.includes(assignment.parentDoc));
        return {
          assignment,
          user: user.data,
          roarUid: user.name.split('/users/')[1],
        };
      });

      if (includeScores) {
        // Use batchGet to get all of the run docs (including their scores)
        const runDocPaths = _flatten(
          assignmentData.map((assignment) => {
            const firestoreBasePath = 'https://firestore.googleapis.com/v1/';
            const adminBasePath = adminAxiosInstance.defaults.baseURL.replace(firestoreBasePath, '');
            const appBasePath = appAxiosInstance.defaults.baseURL.replace(firestoreBasePath, '');
            const runIds = _without(
              assignment.assessments.map((assessment) => assessment.runId),
              undefined,
            );
            const userPath = userDocPaths.find((userDocPath) => userDocPath.includes(assignment.parentDoc));
            return runIds.map((runId) => `${userPath.replace(adminBasePath, appBasePath)}/runs/${runId}`);
          }),
        );

        const batchRunDocs = await appAxiosInstance
          .post(':batchGet', {
            documents: runDocPaths,
            mask: { fieldPaths: ['scores'] },
          })
          .then(({ data }) => {
            return _without(
              data.map(({ found }) => {
                if (found) {
                  return {
                    name: found.name,
                    data: _mapValues(found.fields, (value) => convertValues(value)),
                  };
                }
                return undefined;
              }),
              undefined,
            );
          });

        // Again the order of batchGet is not guaranteed. This time, we'd like to
        // group the runDocs by user's roarUid, in the same order as the userDocPaths
        const runs = _groupBy(batchRunDocs, (runDoc) => runDoc.name.split('/users/')[1].split('/runs/')[0]);

        for (const score of scoresObj) {
          const userRuns = runs[score.roarUid];
          for (const task of score.assignment.assessments) {
            const runId = task.runId;
            task['scores'] = _get(
              _find(userRuns, (runDoc) => runDoc.name.includes(runId)),
              'data.scores',
            );
          }
        }
      }

      return scoresObj;
    });
  }
};

export const getUserAssignments = async (roarUid) => {
  const adminAxiosInstance = getAxiosInstance();
  const assignmentRequest = getAssignmentsRequestBody({
    aggregationQuery: false,
    paginate: false,
    isCollectionGroupQuery: false,
  });
  return await adminAxiosInstance.post(`/users/${roarUid}:runQuery`, assignmentRequest).then(async ({ data }) => {
    const assignmentData = mapFields(data);
    const openAssignments = assignmentData.filter((assignment) => new Date(assignment.dateOpened) <= new Date());
    return openAssignments;
  });
};

export const assignmentFetchAll = async (adminId, orgType, orgId, includeScores = false) => {
  return await assignmentPageFetcher(
    adminId,
    orgType,
    orgId,
    { value: 2 ** 31 - 1 },
    { value: 0 },
    includeScores,
    true,
    true,
  );
};
