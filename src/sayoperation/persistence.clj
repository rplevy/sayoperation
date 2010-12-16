(ns sayoperation.persistence
  (:use (clojure.contrib pprint)
        [clojure.contrib.duck-streams :only (append-spit)]
        (sayoperation utils config))
  (:import (java.io BufferedWriter FileWriter)))

(defn save-state [games-ref users-ref]
  (save-data games-ref *games-file*)
  (save-data users-ref *users-file*))

(defn restore-state [games-ref users-ref]
  (let [games (restore-data *games-file*)
        users (restore-data *users-file*)]
    (when games (ref-set games-ref games))
    (when users (ref-set users-ref users))))

(defn create-result [game move]
  (vector
   (:pieces (:board game))
   (:subject (:board game))
   (:target (:board game))
   (:subject move)
   (:target move)
   (:correct game)
   (:instruction game)))

(def *results* (ref []))

(defn record-result
  "queue data to later be appended to a file"
  [game move]
  (dosync
   (ref-set *results*
            (cons (create-result game move) @*results*))))

(defn save-results []
  (when @*results*
    (doseq [r @*results*]
      (append-spit *results-file* r)
      (append-spit *results-file* "\n"))
    (dosync (ref-set *results* []))))

(defn init-state [games-ref users-ref]
  
  ;; restore when loading server
  ;; or when re-evaluating source in dev
  (dosync (restore-state games-ref users-ref))

  ;; a repeating schedule for save-state and save-results
  (defonce *schedule*
    (future (while true
              (Thread/sleep (minutes 5))
              (save-state games-ref users-ref)
              (save-results)))))

