<script>
export default {
  methods: {
    goToBIM() {
      this.$router.push("/bim");
    },
    goToVarema() {
      this.$router.push("/varema");
    },
  },
};
</script>

<template>
  <div class="about">
    <h1>Here is the 3d viewer project for the following buildings</h1>
    <div class="styleButton">
      <button @click="goToBIM()">BIM</button>
      <button @click="goToVarema()">Varema</button>
      <!-- <button @click="goToHome()">vattenfall</button> -->
      <!-- <button>BIM</button> -->
      <button>vago</button>
    </div>
  </div>
</template>

<style>
@media (min-width: 1024px) {
  .about {
    color: rgb(15, 108, 31);
    font-size: medium;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .styleButton {
    /* max-width: 100px; */
    /* align-items: center; */
    display: contents;
    display: flex;
    flex-direction: column;
  }
}
</style>
