<template>
  <main class="container main">
    <section class="main-body">
      <PvPanel header="Create a new organization">
        Use this form to create a new organization.

        <PvDivider />

        <div class="grid column-gap-3 mt-5">
          <div class="col-12 md:col-6 lg:col-3 xl:col-3">
            <span class="p-float-label">
              <PvDropdown
                v-model="orgType"
                input-id="org-type"
                :options="orgTypes"
                show-clear
                option-label="singular"
                placeholder="Select an org type"
                class="w-full"
              />
              <label for="org-type">Org Type</label>
            </span>
          </div>
        </div>

        <div v-if="parentOrgRequired" class="grid mt-4">
          <div class="col-12 md:col-6 lg:col-4">
            <span class="p-float-label">
              <PvDropdown
                v-model="state.parentDistrict"
                input-id="parent-district"
                :options="districts"
                show-clear
                option-label="name"
                placeholder="Select a district"
                :loading="isLoadingDistricts"
                class="w-full"
              />
              <label for="parent-district">District</label>
              <small v-if="v$.parentDistrict.$invalid && submitted" class="p-error"> Please select a district. </small>
            </span>
          </div>

          <div v-if="orgType.singular === 'class'" class="col-12 md:col-6 lg:col-4">
            <span class="p-float-label">
              <PvDropdown
                v-model="state.parentSchool"
                input-id="parent-school"
                :options="schools"
                show-clear
                option-label="name"
                :placeholder="schoolDropdownEnabled ? 'Select a school' : 'Please select a district first'"
                :loading="!schoolDropdownEnabled"
                class="w-full"
              />
              <label for="parent-school">School</label>
              <small v-if="v$.parentSchool.$invalid && submitted" class="p-error"> Please select a district. </small>
            </span>
          </div>
        </div>

        <div class="grid mt-3">
          <div class="col-12 md:col-6 lg:col-4 mt-3">
            <span class="p-float-label">
              <PvInputText id="org-name" v-model="state.orgName" class="w-full" />
              <label for="org-name">{{ orgTypeLabel }} Name</label>
              <small v-if="v$.orgName.$invalid && submitted" class="p-error">Please supply a name</small>
            </span>
          </div>

          <div class="col-12 md:col-6 lg:col-4 mt-3">
            <span class="p-float-label">
              <PvInputText id="org-initial" v-model="state.orgInitials" class="w-full" />
              <label for="org-initial">{{ orgTypeLabel }} Abbreviation</label>
              <small v-if="v$.orgInitials.$invalid && submitted" class="p-error">Please supply an abbreviation</small>
            </span>
          </div>

          <div v-if="orgType?.singular === 'class'" class="col-12 md:col-6 lg:col-4 mt-3">
            <span class="p-float-label">
              <PvDropdown
                v-model="state.grade"
                input-id="grade"
                :options="grades"
                show-clear
                option-label="name"
                placeholder="Select a grade"
                class="w-full"
              />
              <label for="grade">Grade</label>
              <small v-if="v$.grade.$invalid && submitted" class="p-error">Please select a grade</small>
            </span>
          </div>
        </div>

        <div class="mt-5 mb-0 pb-0">Optional fields:</div>

        <div v-if="['district', 'school', 'group'].includes(orgType?.singular)">
          <div class="grid column-gap-3">
            <div v-if="['district', 'school'].includes(orgType?.singular)" class="col-12 md:col-6 lg:col-4 mt-5">
              <span class="p-float-label">
                <PvInputText v-model="state.ncesId" v-tooltip="ncesTooltip" input-id="nces-id" class="w-full" />
                <label for="nces-id">NCES ID</label>
              </span>
            </div>
          </div>
          <div class="grid mt-3">
            <div class="col-12">Search for a {{ orgType.singular }} address:</div>
            <div class="col-12 md:col-6 lg:col-6 xl:col-6 p-inputgroup">
              <span class="p-inputgroup-addon">
                <i class="pi pi-map"></i>
              </span>
              <GMapAutocomplete
                :options="{
                  fields: ['address_components', 'formatted_address', 'place_id', 'url'],
                }"
                class="p-inputtext p-component w-full"
                @place_changed="setAddress"
              >
              </GMapAutocomplete>
            </div>
          </div>
          <div v-if="state.address?.formattedAddress" class="grid">
            <div class="col-12 mt-3">
              {{ orgTypeLabel }} Address:
              <PvChip :label="state.address.formattedAddress" removable @remove="removeAddress" />
            </div>
          </div>
        </div>

        <div class="grid mt-3">
          <div class="col-12 md:col-6 lg:col-4 mt-3">
            <span class="p-float-label">
              <PvAutoComplete
                v-model="state.tags"
                multiple
                dropdown
                :options="allTags"
                :suggestions="tagSuggestions"
                name="tags"
                class="w-full"
                @complete="searchTags"
              />
              <label for="tags">Tags</label>
            </span>
          </div>
        </div>

        <PvDivider />

        <div class="grid">
          <div class="col-12">
            <PvButton :label="`Create ${orgTypeLabel}`" :disabled="orgTypeLabel === 'Org'" @click="submit" />
          </div>
        </div>
      </PvPanel>
    </section>
  </main>
</template>

<script setup>
import { computed, reactive, ref, toRaw, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { storeToRefs } from 'pinia';
import _capitalize from 'lodash/capitalize';
import _union from 'lodash/union';
import _without from 'lodash/without';
import { useQuery } from '@tanstack/vue-query';
import { useVuelidate } from '@vuelidate/core';
import { required, requiredIf } from '@vuelidate/validators';
import { useAuthStore } from '@/store/auth';
import { fetchDocById } from '@/helpers/query/utils';
import { orgFetcher } from '@/helpers/query/orgs';

const initialized = ref(false);
const toast = useToast();
const authStore = useAuthStore();
const { roarfirekit } = storeToRefs(authStore);

const state = reactive({
  orgName: '',
  orgInitials: '',
  ncesId: undefined,
  address: undefined,
  parentDistrict: undefined,
  parentSchool: undefined,
  grade: undefined,
  tags: [],
});

let unsubscribe;
const initTable = () => {
  if (unsubscribe) unsubscribe();
  initialized.value = true;
};

unsubscribe = authStore.$subscribe(async (mutation, state) => {
  if (state.roarfirekit.restConfig) initTable();
});

onMounted(() => {
  if (roarfirekit.value.restConfig) initTable();
});

const { isLoading: isLoadingClaims, data: userClaims } = useQuery({
  queryKey: ['userClaims', authStore.uid],
  queryFn: () => fetchDocById('userClaims', authStore.uid),
  keepPreviousData: true,
  enabled: initialized,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

const isSuperAdmin = computed(() => Boolean(userClaims.value?.claims?.super_admin));
const adminOrgs = computed(() => userClaims.value?.claims?.minimalAdminOrgs);

const claimsLoaded = computed(() => !isLoadingClaims.value);

const { isLoading: isLoadingDistricts, data: districts } = useQuery({
  queryKey: ['districts'],
  queryFn: () => orgFetcher('districts', undefined, isSuperAdmin, adminOrgs, ['name', 'id', 'tags']),
  keepPreviousData: true,
  enabled: claimsLoaded,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

const { data: groups } = useQuery({
  queryKey: ['groups'],
  queryFn: () => orgFetcher('groups', undefined, isSuperAdmin, adminOrgs, ['name', 'id', 'tags']),
  keepPreviousData: true,
  enabled: claimsLoaded,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

const schoolQueryEnabled = computed(() => {
  return claimsLoaded.value && state.parentDistrict !== undefined;
});

const selectedDistrict = computed(() => state.parentDistrict?.id);

const { isFetching: isFetchingSchools, data: schools } = useQuery({
  queryKey: ['schools', selectedDistrict],
  queryFn: () => orgFetcher('schools', selectedDistrict, isSuperAdmin, adminOrgs, ['name', 'id', 'tags']),
  keepPreviousData: true,
  enabled: schoolQueryEnabled,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

const classQueryEnabled = computed(() => {
  return claimsLoaded.value && state.parentSchool !== undefined;
});

const schoolDropdownEnabled = computed(() => {
  return state.parentDistrict && !isFetchingSchools.value;
});

const selectedSchool = computed(() => state.parentSchool?.id);

const { data: classes } = useQuery({
  queryKey: ['classes', selectedSchool],
  queryFn: () => orgFetcher('classes', selectedSchool, isSuperAdmin, adminOrgs, ['name', 'id', 'tags']),
  keepPreviousData: true,
  enabled: classQueryEnabled,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

const rules = {
  orgName: { required },
  orgInitials: { required },
  parentDistrict: { required: requiredIf(() => ['school', 'class'].includes(orgType.value.singular)) },
  parentSchool: { required: requiredIf(() => orgType.value.singular === 'class') },
  grade: { required: requiredIf(() => orgType.value.singular === 'class') },
};

const v$ = useVuelidate(rules, state);
const submitted = ref(false);

const orgTypes = [
  { firestoreCollection: 'districts', singular: 'district' },
  { firestoreCollection: 'schools', singular: 'school' },
  { firestoreCollection: 'classes', singular: 'class' },
  { firestoreCollection: 'groups', singular: 'group' },
];

const orgType = ref();
const orgTypeLabel = computed(() => {
  if (orgType.value) {
    return _capitalize(orgType.value.singular);
  }
  return 'Org';
});

const parentOrgRequired = computed(() => ['school', 'class'].includes(orgType.value?.singular));

const grades = [
  { name: 'Pre-K', value: 'PK' },
  { name: 'Transitional Kindergarten', value: 'TK' },
  { name: 'Kindergarten', value: 'K' },
  { name: 'Grade 1', value: 1 },
  { name: 'Grade 2', value: 2 },
  { name: 'Grade 3', value: 3 },
  { name: 'Grade 4', value: 4 },
  { name: 'Grade 5', value: 5 },
  { name: 'Grade 6', value: 6 },
  { name: 'Grade 7', value: 7 },
  { name: 'Grade 8', value: 8 },
  { name: 'Grade 9', value: 9 },
  { name: 'Grade 10', value: 10 },
  { name: 'Grade 11', value: 11 },
  { name: 'Grade 12', value: 12 },
];

const allTags = computed(() => {
  const districtTags = (districts.value ?? []).map((org) => org.tags);
  const schoolTags = (districts.value ?? []).map((org) => org.tags);
  const classTags = (classes.value ?? []).map((org) => org.tags);
  const groupTags = (groups.value ?? []).map((org) => org.tags);
  return _without(_union(...districtTags, ...schoolTags, ...classTags, ...groupTags), undefined) || [];
});

const ncesTooltip = computed(() => {
  if (orgType.value?.singular === 'school') {
    return '12 digit NCES school identification number';
  } else if (orgType.value?.singular === 'district') {
    return '7 digit NCES district identification number';
  }
  return '';
});

const tagSuggestions = ref([]);
const searchTags = (event) => {
  const query = event.query.toLowerCase();
  let filteredOptions = allTags.value.filter((opt) => opt.toLowerCase().includes(query));
  if (filteredOptions.length === 0 && query) {
    filteredOptions.push(query);
  } else {
    filteredOptions = filteredOptions.map((opt) => opt);
  }
  tagSuggestions.value = filteredOptions;
};

const setAddress = (place) => {
  state.address = {
    addressComponents: place.address_components || [],
    formattedAddress: place.formatted_address,
    googlePlacesId: place.place_id,
    googleMapsUrl: place.url,
  };
};

const removeAddress = () => {
  state.address = undefined;
};

const submit = async () => {
  submitted.value = true;
  const isFormValid = await v$.value.$validate();
  if (isFormValid) {
    let orgData = {
      name: state.orgName,
      abbreviation: state.orgInitials,
    };

    if (state.grade) orgData.grade = toRaw(state.grade).value;
    if (state.ncesId) orgData.ncesId = state.ncesId;
    if (state.address) orgData.address = state.address;
    if (state.tags.length > 0) orgData.tags = state.tags;

    if (orgType.value?.singular === 'class') {
      orgData.schoolId = toRaw(state.parentSchool).id;
      orgData.districtId = toRaw(state.parentDistrict).id;
    } else if (orgType.value?.singular === 'school') {
      orgData.districtId = toRaw(state.parentDistrict).id;
    }

    await roarfirekit.value.createOrg(orgType.value.firestoreCollection, orgData).then(() => {
      toast.add({ severity: 'success', summary: 'Success', detail: 'Org created', life: 3000 });
      submitted.value = false;
      resetForm();
    });
  } else {
    console.log('Form is invalid');
  }
};

const resetForm = () => {
  state.orgName = '';
  state.orgInitials = '';
  state.ncesId = undefined;
  state.address = undefined;
  state.grade = undefined;
  state.tags = [];
};
</script>

<style lang="scss">
.return-button {
  display: block;
  margin: 1rem 1.75rem;
}

#rectangle {
  background: #fcfcfc;
  border-radius: 0.3125rem;
  border-style: solid;
  border-width: 0.0625rem;
  border-color: #e5e5e5;
  margin: 0 1.75rem;
  padding-top: 1.75rem;
  padding-left: 1.875rem;
  text-align: left;
  overflow: hidden;

  hr {
    margin-top: 2rem;
    margin-left: -1.875rem;
  }

  #heading {
    font-family: 'Source Sans Pro', sans-serif;
    font-weight: 400;
    color: #000000;
    font-size: 1.625rem;
    line-height: 2.0425rem;
  }

  #section-heading {
    font-family: 'Source Sans Pro', sans-serif;
    font-weight: 400;
    font-size: 1.125rem;
    line-height: 1.5681rem;
    color: #525252;
  }

  #administration-name {
    height: 100%;
    border-radius: 0.3125rem;
    border-width: 0.0625rem;
    border-color: #e5e5e5;
  }

  #section {
    margin-top: 1.375rem;
  }

  #section-content {
    font-family: 'Source Sans Pro', sans-serif;
    font-weight: 400;
    font-size: 0.875rem;
    line-height: 1.22rem;
    color: #525252;
    margin: 0.625rem 0rem;
  }

  ::placeholder {
    font-family: 'Source Sans Pro', sans-serif;
    color: #c4c4c4;
  }

  .hide {
    display: none;
  }
}
</style>
