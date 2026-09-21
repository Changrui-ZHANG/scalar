
<script setup lang="ts">

    const exercices = ref("");
    const payload = ref("");
    async function useApi(path: string) {
        const res = await $fetch(path, {
            method: "POST",
            body: { data: payload.value },
        });
        console.log(res);
        exercices.value = res;
    }
</script>

<template>
    <form @click.prevent="execute">
        <pre>{{ exercices }}</pre>
        <br/>
        <input type="text" v-model="payload">
        <br/>
        <button @click="useApi('/api/v1/exercices')">post payload</button>
    </form>
</template>