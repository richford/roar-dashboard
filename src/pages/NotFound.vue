<template>
  <div class="col-full text-center">
    <h1>Page not found</h1>
    <p>Sorry! We couldn't find that page.</p>
    <router-link :to="{ name: 'Home' }">
      <PvButton label="Click here to go to the home page" icon="pi pi-home" />
    </router-link>
  </div>
</template>

<script></script>

<style scoped></style>
