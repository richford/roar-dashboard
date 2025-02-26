<template>
  <div v-if="isLoading">
    <div class="col-full text-center">
      <AppSpinner />
      <p class="text-center">Loading...</p>
    </div>
  </div>
  <div v-else>
    <HomeParticipant v-if="!isAdmin" />
    <HomeAdministrator v-else-if="isAdmin" />
  </div>
  <ConsentModal
    v-if="showConsent"
    :consent-text="confirmText"
    :consent-type="consentType"
    @accepted="updateConsent"
    @delayed="refreshDocs"
  />
  <PvConfirmDialog group="inactivity-logout" class="confirm">
    <template #message>
      You will soon be logged out for security purposes. Please click "Continue" if you wish to continue your session.
      Otherwise, you will be automatically logged out in {{ timeLeft }} seconds.
    </template>
  </PvConfirmDialog>
</template>

<script setup>
import { computed, onMounted, ref, toRaw, watch } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { useIdle } from '@vueuse/core';
import { useConfirm } from 'primevue/useconfirm';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { useGameStore } from '@/store/game';
import HomeParticipant from '@/pages/HomeParticipant.vue';
import HomeAdministrator from '@/pages/HomeAdministrator.vue';
import _get from 'lodash/get';
import _isEmpty from 'lodash/isEmpty';
import _union from 'lodash/union';
import { storeToRefs } from 'pinia';
import ConsentModal from '@/components/ConsentModal.vue';
import { fetchDocById } from '@/helpers/query/utils';

const authStore = useAuthStore();
const { roarfirekit, userQueryKeyIndex } = storeToRefs(authStore);

const gameStore = useGameStore();
const { requireRefresh } = storeToRefs(gameStore);

const initialized = ref(false);
let unsubscribe;
const init = () => {
  if (unsubscribe) unsubscribe();
  initialized.value = true;
};

unsubscribe = authStore.$subscribe(async (mutation, state) => {
  if (state.roarfirekit.restConfig) init();
});

const { isLoading: isLoadingUserData, data: userData } = useQuery({
  queryKey: ['userData', authStore.uid, userQueryKeyIndex],
  queryFn: () => fetchDocById('users', authStore.uid),
  keepPreviousData: true,
  enabled: initialized,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

const { isLoading: isLoadingClaims, data: userClaims } = useQuery({
  queryKey: ['userClaims', authStore.uid, userQueryKeyIndex],
  queryFn: () => fetchDocById('userClaims', authStore.uid),
  keepPreviousData: true,
  enabled: initialized,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

const isLoading = computed(() => isLoadingClaims.value || isLoadingUserData.value);

const isAdmin = computed(() => {
  if (userClaims.value?.claims?.super_admin) return true;
  if (_isEmpty(_union(...Object.values(userClaims.value?.claims?.minimalAdminOrgs ?? {})))) return false;
  return true;
});

const consentType = computed(() => (isAdmin.value ? 'tos' : 'assent'));
const showConsent = ref(false);
const confirmText = ref('');
const consentVersion = ref('');

async function updateConsent() {
  await authStore.updateConsentStatus(consentType.value, consentVersion.value);
  userQueryKeyIndex.value += 1;
}

function refreshDocs() {
  userQueryKeyIndex.value += 1;
}

async function checkConsent() {
  // Check for consent
  const consentStatus = _get(userData.value, `legal.${consentType.value}`);
  const consentDoc = await authStore.getLegalDoc(consentType.value);
  consentVersion.value = consentDoc.version;
  if (!_get(toRaw(consentStatus), consentDoc.version)) {
    confirmText.value = consentDoc.text;
    showConsent.value = true;
  }
}

const router = useRouter();

onMounted(async () => {
  if (requireRefresh.value) {
    requireRefresh.value = false;
    router.go(0);
  }
  if (roarfirekit.value.restConfig) init();
  if (!isLoading.value) {
    refreshDocs();
    await checkConsent();
  }
});

watch(isLoading, async (newValue) => {
  if (!newValue) {
    await checkConsent();
  }
});

const { idle } = useIdle(10 * 60 * 1000); // 10 min
const confirm = useConfirm();
const timeLeft = ref(60);

watch(idle, (idleValue) => {
  if (idleValue) {
    const timer = setInterval(async () => {
      timeLeft.value -= 1;

      if (timeLeft.value <= 0) {
        clearInterval(timer);
        const authStore = useAuthStore();
        await authStore.signOut();
        router.replace({ name: 'SignIn' });
      }
    }, 1000);
    confirm.require({
      group: 'inactivity-logout',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Continue',
      acceptIcon: 'pi pi-check',
      accept: () => {
        clearInterval(timer);
        timeLeft.value = 60;
      },
    });
  }
});
</script>

<style>
.confirm .p-confirm-dialog-reject {
  display: none !important;
}

.confirm .p-dialog-header-close {
  display: none !important;
}
</style>
